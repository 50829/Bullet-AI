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
import { DataBroadcast, type DataNotifier } from "../local/channel";
import { createDataQueryClient } from "./query-client";
import { loadLocalFirstResource } from "./resource-loader";
import { DataStore, type DataStoreApi } from "../local/store";
import { logger } from "../../lib/observability/logger";
import type {
  DataResource,
  EnqueueMutationInput,
  EntityByResource,
  MutationRecord,
} from "../local/types";
import { DATA_QUERY_KEY_PREFIX } from "../protocol";

export interface DataSyncControl {
  start(): void;
  stop(): void;
  requestFlush(): Promise<void>;
}

type DataContextValue = {
  store: DataStoreApi;
  notifier: DataNotifier;
  worker: DataSyncControl | null;
};

const DataContext = createContext<DataContextValue | null>(null);

export function dataQueryKey(userId: string, resource: DataResource) {
  return [DATA_QUERY_KEY_PREFIX, userId, resource] as const;
}

export function DataProvider({
  children,
  store: suppliedStore,
  notifier: suppliedNotifier,
  worker = null,
  queryClient: suppliedQueryClient,
}: {
  children: ReactNode;
  store?: DataStoreApi;
  notifier?: DataNotifier;
  worker?: DataSyncControl | null;
  queryClient?: QueryClient;
}) {
  const [notifier] = useState<DataNotifier>(
    () => suppliedNotifier ?? new DataBroadcast(),
  );
  const [store] = useState<DataStoreApi>(
    () => suppliedStore ?? new DataStore({ notifier }),
  );
  const [queryClient] = useState(
    () => suppliedQueryClient ?? createDataQueryClient(),
  );

  useEffect(() => {
    const unsubscribe = notifier.subscribe((event) => {
      void queryClient.invalidateQueries({
        queryKey: dataQueryKey(event.userId, event.resource),
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
    <DataContext.Provider value={{ store, notifier, worker }}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </DataContext.Provider>
  );
}

export function useDataRuntime() {
  const value = useContext(DataContext);
  if (!value)
    throw new Error("useDataRuntime must be used within DataProvider");
  return value;
}

export function useDataResource<R extends DataResource>(
  userId: string | null,
  resource: R,
  options?: {
    remoteLoader?: () => Promise<
      EntityByResource[R][] | { kind: "snapshots-managed" }
    >;
  },
) {
  const { store } = useDataRuntime();
  const queryClient = useQueryClient();
  const queryKey = dataQueryKey(userId ?? "anonymous", resource);
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
  const { store, worker } = useDataRuntime();
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
          queryClient.setQueryData(dataQueryKey(userId, resource), records);
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
