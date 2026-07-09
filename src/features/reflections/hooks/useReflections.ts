"use client";

import { useCallback, useMemo } from "react";
import { createClientId } from "../../../lib/localDb/repository";
import { createOptimisticId } from "../../../lib/localFirst/ids";
import { useLocalFirstCollection } from "../../../lib/localFirst/useLocalFirstCollection";
import type {
  CreateReflectionInput,
  ReflectionRecord,
  UpdateReflectionInput,
} from "../types";

type UseReflectionsInput = {
  userId: string | null;
  remotePageSize?: number;
};

export function useReflections({
  userId,
  remotePageSize = 20,
}: UseReflectionsInput) {
  const collection = useLocalFirstCollection<ReflectionRecord>({
    userId,
    collection: "reflections",
    initialRemotePageSize: remotePageSize,
  });

  const createReflection = useCallback(
    async (input: CreateReflectionInput) => {
      const now = new Date().toISOString();
      const createdAt = input.created_at ?? now;
      await collection.add({
        id: input.id ?? createOptimisticId(),
        client_id: input.client_id ?? createClientId("reflection"),
        content: input.content,
        title: input.title ?? null,
        body: input.body ?? null,
        source: input.source ?? null,
        source_type: input.source_type ?? null,
        location: input.location ?? null,
        image_url: input.image_url ?? null,
        image_path: input.image_path ?? null,
        created_at: createdAt,
        updated_at: now,
      });
    },
    [collection],
  );

  const updateReflection = useCallback(
    async (id: number, updates: UpdateReflectionInput) => {
      await collection.update(id, updates);
    },
    [collection],
  );

  return useMemo(
    () => ({
      reflections: collection.items,
      loading: collection.loading,
      loadingMoreReflections: collection.loadingMore,
      hasMoreReflections: collection.hasMore,
      refreshReflections: () => collection.refresh(),
      loadMoreReflections: () => collection.loadMore(),
      createReflection,
      updateReflection,
      deleteReflection: collection.remove,
    }),
    [collection, createReflection, updateReflection],
  );
}
