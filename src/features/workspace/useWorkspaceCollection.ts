"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { supabase } from "../../lib/supabaseClient";
import { getLocalFirstRepository } from "../../lib/localDb/localFirstRepository";
import { flushOutbox } from "../../lib/localDb/syncEngine";
import type { LocalCollection } from "../../lib/localDb/types";
import type { WorkspaceEntity } from "./types";
import {
  attachSignedUrls,
  ensureLocalFields,
  repositoryFor,
  sortByCreatedAtDesc,
  stripLocalFields,
  visibleRemoteRows,
  withFormattedDate,
  type RepositoryEntity,
} from "./collectionUtils";

type WorkspaceCollectionBucket = "moments" | "reflections" | "goals";

type UseWorkspaceCollectionInput = {
  userId: string | null;
  collection: WorkspaceCollectionBucket;
  remoteOrder?: { column: string; ascending: boolean };
};

export type WorkspaceCollectionController<T extends WorkspaceEntity> = {
  items: T[];
  loading: boolean;
  setItems: Dispatch<SetStateAction<T[]>>;
  refresh: (
    activeUserId?: string,
    options?: { showLoading?: boolean },
  ) => Promise<void>;
  add: (item: T) => Promise<void>;
  update: (id: number, updates: Partial<T>) => Promise<void>;
  remove: (id: number, imagePath?: string | null) => Promise<void>;
  queueUpdate: (
    entity: T,
    operation?: "upsert" | "update",
  ) => Promise<void>;
};

function signedOutLoading(userId: string | null) {
  return Boolean(userId);
}

export function useWorkspaceCollection<T extends WorkspaceEntity>({
  userId,
  collection,
  remoteOrder = { column: "created_at", ascending: false },
}: UseWorkspaceCollectionInput): WorkspaceCollectionController<T> {
  const repository = useMemo(
    () => getLocalFirstRepository<T>(collection),
    [collection],
  );
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(() => signedOutLoading(userId));

  const loadCached = useCallback(
    async (activeUserId: string) => {
      try {
        const cached = await repository.list(activeUserId);
        setItems(sortByCreatedAtDesc(cached.map(withFormattedDate) as T[]));
        setLoading(false);
      } catch (error) {
        console.error(`Failed to read ${collection} cache:`, error);
      }
    },
    [collection, repository],
  );

  const refresh = useCallback(
    async (activeUserId = userId, options?: { showLoading?: boolean }) => {
      if (!activeUserId) return;
      if (options?.showLoading) setLoading(true);

      try {
        const { data, error } = await supabase
          .from(collection)
          .select("*")
          .eq("user_id", activeUserId)
          .is("deleted_at", null)
          .order(remoteOrder.column, { ascending: remoteOrder.ascending });

        if (error) throw new Error(error.message);

        const remote = await attachSignedUrls(
          collection,
          visibleRemoteRows(data ?? []) as T[],
        );
        const merged = await repository.replaceRemote(
          activeUserId,
          remote as T[],
        );
        setItems(sortByCreatedAtDesc(merged.map(withFormattedDate)));
      } catch (error) {
        console.error(`Failed to revalidate ${collection}:`, error);
      } finally {
        setLoading(false);
      }
    },
    [collection, remoteOrder.ascending, remoteOrder.column, repository, userId],
  );

  useEffect(() => {
    let disposed = false;

    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setItems([]);
    setLoading(true);

    void loadCached(userId).then(() => {
      if (!disposed) void refresh(userId);
    });

    return () => {
      disposed = true;
    };
  }, [loadCached, refresh, userId]);

  const queueUpdate = useCallback(
    async (entity: T, operation: "upsert" | "update" = "update") => {
      if (!userId) return;

      const payload = {
        ...stripLocalFields(entity as Record<string, unknown>),
        user_id: entity.user_id ?? userId,
      };

      await repositoryFor(collection as LocalCollection).mutate(
        userId,
        payload as RepositoryEntity,
        operation,
      );
      void flushOutbox();
    },
    [collection, userId],
  );

  const add = useCallback(
    async (item: T) => {
      const next = withFormattedDate(
        ensureLocalFields(collection, item, userId),
      ) as T;
      await queueUpdate(next, "upsert");
      setItems((current) => sortByCreatedAtDesc([next, ...current]));
    },
    [collection, queueUpdate, userId],
  );

  const update = useCallback(
    async (id: number, updates: Partial<T>) => {
      const current = items.find((item) => item.id === id);
      if (!current) return;
      const updated = withFormattedDate({
        ...current,
        ...updates,
        updated_at: new Date().toISOString(),
      }) as T;
      await queueUpdate(updated, "update");
      setItems((currentItems) =>
        sortByCreatedAtDesc(
          currentItems.map((item) => (item.id === id ? updated : item)),
        ),
      );
    },
    [items, queueUpdate],
  );

  const remove = useCallback(
    async (id: number, imagePath?: string | null) => {
      if (!userId) return;
      const existing = (await repositoryFor(collection).list(userId)).find(
        (entity) => entity.id === id,
      );
      await repositoryFor(collection).remove(userId, {
        ...(existing ?? { id, user_id: userId }),
        image_path: imagePath ?? existing?.image_path ?? null,
      });
      void flushOutbox();
      setItems((current) => current.filter((item) => item.id !== id));
    },
    [collection, userId],
  );

  return useMemo(
    () => ({
      items,
      loading,
      setItems,
      refresh,
      add,
      update,
      remove,
      queueUpdate,
    }),
    [add, items, loading, queueUpdate, refresh, remove, update],
  );
}
