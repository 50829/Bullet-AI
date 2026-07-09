"use client";

import type { SetStateAction } from "react";
import {
  defaultOrderFor,
  type CollectionOrder,
} from "../localDb/collectionSchemas";
import { getCollectionRepository } from "../localDb/collectionRepository";
import {
  readRemoteCollection,
  readRemoteCollectionPage,
} from "../localDb/remoteReader";
import { flushOutbox } from "../localDb/syncEngine";
import type { LocalCollection } from "../localDb/types";
import { logger } from "../observability/logger";
import type { LocalFirstEntity } from "./types";
import { ensureLocalFields, type RepositoryEntity } from "./entityFactory";
import { sortByCreatedAtDesc } from "./ordering";
import { stripLocalFields } from "./payload";
import { withFormattedDate } from "./presentation";

type LocalFirstCollectionState<T extends LocalFirstEntity> = {
  userId: string | null;
  items: T[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
};

type LocalFirstCollectionStoreInput = {
  collection: LocalCollection;
  remoteOrder?: CollectionOrder;
  initialRemotePageSize?: number;
};

type LocalFirstCollectionListener = () => void;

const SERVER_SNAPSHOT = {
  userId: null,
  items: [],
  loading: false,
  loadingMore: false,
  hasMore: false,
} satisfies LocalFirstCollectionState<LocalFirstEntity>;

export class LocalFirstCollectionStore<T extends LocalFirstEntity> {
  private readonly repository;
  private readonly listeners = new Set<LocalFirstCollectionListener>();
  private remoteOrder: CollectionOrder;
  private readonly initialRemotePageSize?: number;
  private nextRemoteOffset = 0;
  private loadedRemoteEntityIds: string[] = [];
  private state: LocalFirstCollectionState<T> = {
    userId: null,
    items: [],
    loading: false,
    loadingMore: false,
    hasMore: false,
  };
  private loadToken = 0;
  private unsubscribeRepository: (() => void) | null = null;

  constructor(
    readonly collection: LocalCollection,
    remoteOrder?: CollectionOrder,
    initialRemotePageSize?: number,
  ) {
    this.repository = getCollectionRepository<T>(collection);
    this.remoteOrder = remoteOrder ?? defaultOrderFor(collection);
    this.initialRemotePageSize = initialRemotePageSize;
  }

  static create<T extends LocalFirstEntity>({
    collection,
    remoteOrder,
    initialRemotePageSize,
  }: LocalFirstCollectionStoreInput) {
    return new LocalFirstCollectionStore<T>(
      collection,
      remoteOrder,
      initialRemotePageSize,
    );
  }

  subscribe = (listener: LocalFirstCollectionListener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.state;

  getServerSnapshot = () => SERVER_SNAPSHOT as LocalFirstCollectionState<T>;

  setUserId = (userId: string | null) => {
    if (this.state.userId === userId) return;

    const token = ++this.loadToken;
    this.nextRemoteOffset = 0;
    this.loadedRemoteEntityIds = [];
    this.unsubscribeRepository?.();
    this.unsubscribeRepository = null;

    if (!userId) {
      this.setState({
        userId: null,
        items: [],
        loading: false,
        loadingMore: false,
        hasMore: false,
      });
      return;
    }

    this.unsubscribeRepository = this.repository.subscribe(userId, () => {
      void this.loadCachedForUser(userId, token);
    });
    this.setState({
      userId,
      items: [],
      loading: true,
      loadingMore: false,
      hasMore: false,
    });
    void this.loadForUser(userId, token);
  };

  refresh = async (
    activeUserId = this.state.userId,
    options?: { showLoading?: boolean },
  ) => {
    if (!activeUserId) return;
    if (this.isPagedRemoteRead()) {
      await this.loadRemotePage(activeUserId, {
        offset: 0,
        showLoading: options?.showLoading,
      });
      return;
    }
    if (this.isCacheOnlyRemoteRead()) return;
    if (options?.showLoading) this.setState({ loading: true });

    try {
      const remote = await readRemoteCollection<T>(
        activeUserId,
        this.collection,
        this.remoteOrder,
      );
      const merged = await this.repository.replaceRemote(
        activeUserId,
        remote as T[],
      );
      if (this.state.userId !== activeUserId) return;
      this.setState({
        items: sortByCreatedAtDesc(merged.map(withFormattedDate)),
      });
    } catch (error) {
      logger.error("local_first_collection_refresh_failed", {
        collection: this.collection,
        userId: activeUserId,
        error,
      });
    } finally {
      if (this.state.userId === activeUserId) this.setState({ loading: false });
    }
  };

  loadMore = async (activeUserId = this.state.userId) => {
    if (!activeUserId || !this.isPagedRemoteRead()) return;
    if (this.state.loadingMore || !this.state.hasMore) return;

    await this.loadRemotePage(activeUserId, {
      offset: this.nextRemoteOffset,
      showLoadingMore: true,
    });
  };

  queueUpdate = async (
    entity: T,
    operation: "upsert" | "update" = "update",
  ) => {
    const userId = this.state.userId;
    if (!userId) return;

    const payload = {
      ...stripLocalFields(entity as Record<string, unknown>),
      user_id: entity.user_id ?? userId,
    };

    await this.repository.mutate(
      userId,
      payload as T & RepositoryEntity,
      operation,
    );
    void flushOutbox();
  };

  add = async (item: T) => {
    const next = withFormattedDate(
      ensureLocalFields(this.collection, item, this.state.userId),
    ) as T;
    await this.queueUpdate(next, "upsert");
    this.setState((current) => ({
      items: sortByCreatedAtDesc([next, ...current.items]),
    }));
  };

  update = async (id: number, updates: Partial<T>) => {
    const current = this.state.items.find((item) => item.id === id);
    if (!current) return;

    const updated = withFormattedDate({
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    }) as T;
    await this.queueUpdate(updated, "update");
    this.setState((currentState) => ({
      items: sortByCreatedAtDesc(
        currentState.items.map((item) => (item.id === id ? updated : item)),
      ),
    }));
  };

  remove = async (id: number, imagePath?: string | null) => {
    const userId = this.state.userId;
    if (!userId) return;

    const existing = (await this.repository.list(userId)).find(
      (entity) => entity.id === id,
    );
    await this.repository.remove(userId, {
      ...(existing ?? ({ id, user_id: userId } as T)),
      image_path: imagePath ?? existing?.image_path ?? null,
    } as T);
    void flushOutbox();
    this.setState((current) => ({
      items: current.items.filter((item) => item.id !== id),
    }));
  };

  setItems = (action: SetStateAction<T[]>) => {
    this.setState((current) => ({
      items:
        typeof action === "function"
          ? (action as (items: T[]) => T[])(current.items)
          : action,
    }));
  };

  private async loadForUser(userId: string, token: number) {
    await this.loadCachedForUser(userId, token, {
      keepLoadingWhenEmpty: this.isPagedRemoteRead(),
    });

    if (!this.isActiveLoad(userId, token)) return;
    if (this.isCacheOnlyRemoteRead()) {
      this.setState({ loading: false, loadingMore: false, hasMore: false });
      return;
    }

    if (this.isPagedRemoteRead()) {
      await this.loadRemotePage(userId, { offset: 0 });
      return;
    }

    await this.refresh(userId);
  }

  private async loadCachedForUser(
    userId: string,
    token: number,
    options?: { keepLoadingWhenEmpty?: boolean },
  ) {
    try {
      const cached = await this.repository.list(userId);
      if (!this.isActiveLoad(userId, token)) return;
      const items = sortByCreatedAtDesc(cached.map(withFormattedDate) as T[]);
      this.setState({
        items: this.visibleCachedItems(items),
        loading: Boolean(options?.keepLoadingWhenEmpty && cached.length === 0),
      });
    } catch (error) {
      logger.error("local_first_collection_cache_read_failed", {
        collection: this.collection,
        userId,
        error,
      });
    }
  }

  private isActiveLoad(userId: string, token: number) {
    return this.state.userId === userId && this.loadToken === token;
  }

  private async loadRemotePage(
    activeUserId: string,
    options: {
      offset: number;
      showLoading?: boolean;
      showLoadingMore?: boolean;
    },
  ) {
    const pageSize = this.initialRemotePageSize;
    if (!pageSize || pageSize < 1) return;
    if (options.showLoading) this.setState({ loading: true });
    if (options.showLoadingMore) this.setState({ loadingMore: true });

    try {
      const page = await readRemoteCollectionPage<T>(
        activeUserId,
        this.collection,
        {
          limit: pageSize,
          offset: options.offset,
        },
        this.remoteOrder,
      );
      const merged = await this.repository.cacheRemote(
        activeUserId,
        page.items as T[],
      );
      if (this.state.userId !== activeUserId) return;
      this.nextRemoteOffset = page.nextOffset;
      this.rememberLoadedRemoteRows(page.items as T[], options.offset === 0);
      const items = sortByCreatedAtDesc(
        merged.map(withFormattedDate),
      ) as T[];
      this.setState({
        items: this.visiblePagedItems(items),
        hasMore: page.hasMore,
      });
    } catch (error) {
      logger.error("local_first_collection_page_read_failed", {
        collection: this.collection,
        userId: activeUserId,
        error,
      });
    } finally {
      if (this.state.userId === activeUserId) {
        this.setState({ loading: false, loadingMore: false });
      }
    }
  }

  private visibleCachedItems(items: T[]) {
    if (!this.isPagedRemoteRead()) return items;
    return this.visiblePagedItems(items);
  }

  private visiblePagedItems(items: T[]) {
    const remoteIds = new Set(this.loadedRemoteEntityIds);
    const remoteWindow = this.loadedRemoteEntityIds
      .map((entityId) =>
        items.find((item) => this.entityIdentityFor(item) === entityId),
      )
      .filter((item): item is T => Boolean(item));
    const localTransient = items.filter(
      (item) =>
        this.isLocalTransientItem(item) &&
        !remoteIds.has(this.entityIdentityFor(item)),
    );

    return sortByCreatedAtDesc([...localTransient, ...remoteWindow]);
  }

  private isLocalTransientItem(item: T) {
    return Boolean(item._local?.pending || item._local?.failed);
  }

  private rememberLoadedRemoteRows(items: T[], replace: boolean) {
    const current = replace ? [] : this.loadedRemoteEntityIds;
    const seen = new Set(current);
    this.loadedRemoteEntityIds = [...current];

    items.forEach((item) => {
      const identity = this.entityIdentityFor(item);
      if (seen.has(identity)) return;
      seen.add(identity);
      this.loadedRemoteEntityIds.push(identity);
    });
  }

  private entityIdentityFor(item: T) {
    return item.client_id || String(item.id);
  }

  private isPagedRemoteRead() {
    return Boolean(
      this.initialRemotePageSize && this.initialRemotePageSize > 0,
    );
  }

  private isCacheOnlyRemoteRead() {
    return this.initialRemotePageSize === 0;
  }

  private setState(
    updates:
      | Partial<LocalFirstCollectionState<T>>
      | ((
          current: LocalFirstCollectionState<T>,
        ) => Partial<LocalFirstCollectionState<T>>),
  ) {
    const patch = typeof updates === "function" ? updates(this.state) : updates;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
}
