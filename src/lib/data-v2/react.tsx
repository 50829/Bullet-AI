"use client";

import {
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { DataV2Broadcast, type DataV2Notifier } from "./channel";
import { createDataV2QueryClient } from "./query-client";
import { loadLocalFirstResource } from "./resource-loader";
import { DataV2Store, type DataV2StoreApi } from "./store";
import { logger } from "../observability/logger";
import type {
  DataResource,
  EnqueueMutationInput,
  EntityByResource,
  MutationRecord,
} from "./types";

export interface DataV2SyncControl {
  start(): void;
  stop(): void;
  requestFlush(): Promise<void>;
}

type DataV2ContextValue = {
  store: DataV2StoreApi;
  notifier: DataV2Notifier;
  worker: DataV2SyncControl | null;
};

const DataV2Context = createContext<DataV2ContextValue | null>(null);

export function dataV2QueryKey(userId: string, resource: DataResource) {
  return ["data-v2", userId, resource] as const;
}

export function DataV2Provider({
  children,
  store: suppliedStore,
  notifier: suppliedNotifier,
  worker = null,
  queryClient: suppliedQueryClient,
}: {
  children: ReactNode;
  store?: DataV2StoreApi;
  notifier?: DataV2Notifier;
  worker?: DataV2SyncControl | null;
  queryClient?: QueryClient;
}) {
  const [notifier] = useState<DataV2Notifier>(
    () => suppliedNotifier ?? new DataV2Broadcast(),
  );
  const [store] = useState<DataV2StoreApi>(
    () => suppliedStore ?? new DataV2Store({ notifier }),
  );
  const [queryClient] = useState(
    () => suppliedQueryClient ?? createDataV2QueryClient(),
  );

  useEffect(() => {
    const unsubscribe = notifier.subscribe((event) => {
      void queryClient.invalidateQueries({
        queryKey: dataV2QueryKey(event.userId, event.resource),
      });
    });
    worker?.start();
    return () => {
      unsubscribe();
      worker?.stop();
      if (!suppliedNotifier) notifier.close();
    };
  }, [notifier, queryClient, suppliedNotifier, worker]);

  return (
    <DataV2Context.Provider value={{ store, notifier, worker }}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </DataV2Context.Provider>
  );
}

export function useDataV2() {
  const value = useContext(DataV2Context);
  if (!value) throw new Error("useDataV2 must be used within DataV2Provider");
  return value;
}

export function useDataResource<R extends DataResource>(
  userId: string | null,
  resource: R,
  options?: {
    remoteLoader?: () => Promise<EntityByResource[R][]>;
  },
) {
  const { store } = useDataV2();
  const queryClient = useQueryClient();
  const queryKey = dataV2QueryKey(userId ?? "anonymous", resource);
  return useQuery({
    queryKey,
    enabled: Boolean(userId),
    queryFn: ({ signal }) =>
      loadLocalFirstResource({
        store,
        userId: userId!,
        resource,
        online: typeof navigator === "undefined" || navigator.onLine,
        remoteLoader: options?.remoteLoader,
        onBackgroundRefresh: (records) => {
          if (!signal.aborted && queryClient.getQueryState(queryKey)) {
            queryClient.setQueryData(queryKey, records);
          }
        },
        onBackgroundError: (error) => {
          logger.warn("data_v2_background_read_failed", {
            userId,
            resource,
            error,
          });
        },
      }),
  });
}

type BoundEnqueueInput<R extends DataResource> =
  EnqueueMutationInput<R> extends infer Input
    ? Input extends EnqueueMutationInput<R>
      ? Omit<Input, "userId" | "resource">
      : never
    : never;

export function useDataMutation<R extends DataResource>(
  userId: string,
  resource: R,
) {
  const { store, worker } = useDataV2();
  const queryClient = useQueryClient();

  return useMutation<MutationRecord<R> | null, Error, BoundEnqueueInput<R>>({
    mutationFn: (input) =>
      store.enqueueMutation({
        ...input,
        userId,
        resource,
      } as EnqueueMutationInput<R>),
    onSuccess: () => {
      void store
        .readOverlayCollection(userId, resource)
        .then((records) => {
          queryClient.setQueryData(dataV2QueryKey(userId, resource), records);
        })
        .catch((error) => {
          logger.warn("data_v2_overlay_refresh_failed", {
            userId,
            resource,
            error,
          });
        });
      void worker?.requestFlush().catch((error) => {
        logger.warn("data_v2_background_flush_failed", {
          userId,
          resource,
          error,
        });
      });
    },
  });
}
