"use client";

import {
  useEffect,
  useMemo,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  canUseLocalFirstCollectionHook,
  type CollectionOrder,
} from "../localDb/collectionSchemas";
import type { LocalCollection } from "../localDb/types";
import type { LocalFirstEntity } from "./types";
import {
  LocalFirstCollectionStore,
  type LocalFirstInitialSnapshot,
} from "./localFirstCollectionStore";

type UseLocalFirstCollectionInput<T extends LocalFirstEntity> = {
  userId: string | null;
  collection: LocalCollection;
  remoteOrder?: CollectionOrder;
  initialRemotePageSize?: number;
  initialSnapshot?: LocalFirstInitialSnapshot<T>;
};

export type LocalFirstCollectionController<T extends LocalFirstEntity> = {
  items: T[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  setItems: Dispatch<SetStateAction<T[]>>;
  refresh: (
    activeUserId?: string,
    options?: { showLoading?: boolean },
  ) => Promise<void>;
  loadMore: (activeUserId?: string) => Promise<void>;
  add: (item: T) => Promise<void>;
  update: (id: number, updates: Partial<T>) => Promise<void>;
  remove: (id: number, imagePath?: string | null) => Promise<void>;
  queueUpdate: (entity: T, operation?: "upsert" | "update") => Promise<void>;
};

export function useLocalFirstCollection<T extends LocalFirstEntity>({
  userId,
  collection,
  remoteOrder,
  initialRemotePageSize,
  initialSnapshot,
}: UseLocalFirstCollectionInput<T>): LocalFirstCollectionController<T> {
  if (!canUseLocalFirstCollectionHook(collection)) {
    throw new Error(`${collection} cannot use useLocalFirstCollection`);
  }

  const remoteOrderColumn = remoteOrder?.column;
  const remoteOrderAscending = remoteOrder?.ascending;
  const store = useMemo(
    () =>
      LocalFirstCollectionStore.create<T>({
        collection,
        remoteOrder:
          remoteOrderColumn === undefined || remoteOrderAscending === undefined
            ? undefined
            : { column: remoteOrderColumn, ascending: remoteOrderAscending },
        initialRemotePageSize,
        initialSnapshot,
      }),
    [
      collection,
      initialRemotePageSize,
      initialSnapshot,
      remoteOrderAscending,
      remoteOrderColumn,
    ],
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
      loadingMore: snapshot.loadingMore,
      hasMore: snapshot.hasMore,
      setItems: store.setItems,
      refresh: store.refresh,
      loadMore: store.loadMore,
      add: store.add,
      update: store.update,
      remove: store.remove,
      queueUpdate: store.queueUpdate,
    }),
    [
      snapshot.hasMore,
      snapshot.items,
      snapshot.loading,
      snapshot.loadingMore,
      store,
    ],
  );
}
