"use client";

import {
  useEffect,
  useMemo,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { LocalCollection } from "../localDb/types";
import type { LocalFirstEntity } from "./types";
import { LocalFirstCollectionStore } from "./localFirstCollectionStore";

type UseLocalFirstCollectionInput = {
  userId: string | null;
  collection: LocalCollection;
  remoteOrder?: { column: string; ascending: boolean };
};

export type LocalFirstCollectionController<T extends LocalFirstEntity> = {
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

export function useLocalFirstCollection<T extends LocalFirstEntity>({
  userId,
  collection,
  remoteOrder,
}: UseLocalFirstCollectionInput): LocalFirstCollectionController<T> {
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
      }),
    [collection, remoteOrderAscending, remoteOrderColumn],
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
