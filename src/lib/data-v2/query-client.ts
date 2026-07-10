import { QueryClient } from "@tanstack/react-query";

export function createDataV2QueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
        retry: false,
        networkMode: "offlineFirst",
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: false,
        networkMode: "always",
      },
    },
  });
}
