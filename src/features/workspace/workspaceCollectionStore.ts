"use client";

import type { SetStateAction } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getLocalFirstRepository } from "../../lib/localDb/localFirstRepository";
import { flushOutbox } from "../../lib/localDb/syncEngine";
import { logger } from "../../lib/observability/logger";
import type { WorkspaceEntity } from "./types";
import {
  attachSignedUrls,
  ensureLocalFields,
  sortByCreatedAtDesc,
  stripLocalFields,
  visibleRemoteRows,
  withFormattedDate,
  type RepositoryEntity,
} from "./collectionUtils";

export type WorkspaceCollectionBucket = "moments" | "reflections" | "goals";

type WorkspaceCollectionState<T extends WorkspaceEntity> = {
  userId: string | null;
  items: T[];
  loading: boolean;
};

type WorkspaceCollectionStoreInput = {
  collection: WorkspaceCollectionBucket;
  remoteOrder?: { column: string; ascending: boolean };
};

type WorkspaceCollectionListener = () => void;

const SERVER_SNAPSHOT = {
  userId: null,
  items: [],
  loading: false,
} satisfies WorkspaceCollectionState<WorkspaceEntity>;

const WORKSPACE_REMOTE_SELECT: Record<WorkspaceCollectionBucket, string> = {
  moments:
    "id,client_id,user_id,content,image_path,created_at,updated_at,deleted_at",
  reflections:
    "id,client_id,user_id,content,title,body,source,source_type,location,image_path,created_at,updated_at,deleted_at",
  goals:
    "id,client_id,user_id,title,description,status,due_date,progress,color,sort_order,image_path,created_at,updated_at,deleted_at",
};

export class WorkspaceCollectionStore<T extends WorkspaceEntity> {
  private readonly repository;
  private readonly listeners = new Set<WorkspaceCollectionListener>();
  private remoteOrder: { column: string; ascending: boolean };
  private state: WorkspaceCollectionState<T> = {
    userId: null,
    items: [],
    loading: false,
  };
  private loadToken = 0;

  constructor(
    readonly collection: WorkspaceCollectionBucket,
    remoteOrder?: { column: string; ascending: boolean },
  ) {
    this.repository = getLocalFirstRepository<T>(collection);
    this.remoteOrder = remoteOrder ?? {
      column: "created_at",
      ascending: false,
    };
  }

  static create<T extends WorkspaceEntity>({
    collection,
    remoteOrder,
  }: WorkspaceCollectionStoreInput) {
    return new WorkspaceCollectionStore<T>(collection, remoteOrder);
  }

  subscribe = (listener: WorkspaceCollectionListener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.state;

  getServerSnapshot = () => SERVER_SNAPSHOT as WorkspaceCollectionState<T>;

  setUserId = (userId: string | null) => {
    if (this.state.userId === userId) return;

    const token = ++this.loadToken;
    if (!userId) {
      this.setState({ userId: null, items: [], loading: false });
      return;
    }

    this.setState({ userId, items: [], loading: true });
    void this.loadForUser(userId, token);
  };

  refresh = async (
    activeUserId = this.state.userId,
    options?: { showLoading?: boolean },
  ) => {
    if (!activeUserId) return;
    if (options?.showLoading) this.setState({ loading: true });

    try {
      const { data, error } = await supabase
        .from(this.collection)
        .select(WORKSPACE_REMOTE_SELECT[this.collection])
        .eq("user_id", activeUserId)
        .is("deleted_at", null)
        .order(this.remoteOrder.column, {
          ascending: this.remoteOrder.ascending,
        });

      if (error) throw new Error(error.message);

      const remote = await attachSignedUrls(
        this.collection,
        visibleRemoteRows(
          (data ?? []) as unknown as Array<T & { deleted_at?: string | null }>,
        ) as T[],
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
      logger.error("workspace_collection_refresh_failed", {
        collection: this.collection,
        userId: activeUserId,
        error,
      });
    } finally {
      if (this.state.userId === activeUserId) this.setState({ loading: false });
    }
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
    try {
      const cached = await this.repository.list(userId);
      if (!this.isActiveLoad(userId, token)) return;
      this.setState({
        items: sortByCreatedAtDesc(cached.map(withFormattedDate) as T[]),
        loading: false,
      });
    } catch (error) {
      logger.error("workspace_collection_cache_read_failed", {
        collection: this.collection,
        userId,
        error,
      });
    }

    if (this.isActiveLoad(userId, token)) await this.refresh(userId);
  }

  private isActiveLoad(userId: string, token: number) {
    return this.state.userId === userId && this.loadToken === token;
  }

  private setState(
    updates:
      | Partial<WorkspaceCollectionState<T>>
      | ((
          current: WorkspaceCollectionState<T>,
        ) => Partial<WorkspaceCollectionState<T>>),
  ) {
    const patch = typeof updates === "function" ? updates(this.state) : updates;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
}
