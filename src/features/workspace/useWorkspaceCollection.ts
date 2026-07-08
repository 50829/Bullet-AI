"use client";

import {
  useEffect,
  useMemo,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { WorkspaceEntity } from "./types";
import {
  WorkspaceCollectionStore,
  type WorkspaceCollectionBucket,
} from "./workspaceCollectionStore";

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
  queueUpdate: (entity: T, operation?: "upsert" | "update") => Promise<void>;
};

export function useWorkspaceCollection<T extends WorkspaceEntity>({
  userId,
  collection,
  remoteOrder,
}: UseWorkspaceCollectionInput): WorkspaceCollectionController<T> {
  const store = useMemo(
    () =>
      WorkspaceCollectionStore.create<T>({
        collection,
        remoteOrder,
      }),
    [collection, remoteOrder],
  );

  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  useEffect(() => {
    store.setUserId(userId);
  }, [store, userId]);

  return useMemo(
    () => ({
      items: snapshot.items,
      loading: snapshot.loading,
      setItems: store.setItems,
      refresh: store.refresh,
      add: store.add,
      update: store.update,
      remove: store.remove,
      queueUpdate: store.queueUpdate,
    }),
    [snapshot.items, snapshot.loading, store],
  );
}
