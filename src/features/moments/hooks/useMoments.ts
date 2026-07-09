"use client";

import { useCallback, useMemo } from "react";
import { createClientId } from "../../../lib/localDb/repository";
import { createOptimisticId } from "../../../lib/localFirst/ids";
import { useLocalFirstCollection } from "../../../lib/localFirst/useLocalFirstCollection";
import type { CreateMomentInput, MomentRecord, UpdateMomentInput } from "../types";

type UseMomentsInput = {
  userId: string | null;
};

export function useMoments({ userId }: UseMomentsInput) {
  const collection = useLocalFirstCollection<MomentRecord>({
    userId,
    collection: "moments",
  });

  const addMoment = useCallback(
    async (input: CreateMomentInput) => {
      const now = new Date().toISOString();
      const createdAt = input.created_at ?? now;
      await collection.add({
        id: input.id ?? createOptimisticId(),
        client_id: input.client_id ?? createClientId("moment"),
        content: input.content,
        image_path: input.image_path ?? null,
        image_url: input.image_url ?? null,
        local_file: input.local_file ?? null,
        local_file_name: input.local_file_name ?? null,
        previous_image_path: input.previous_image_path ?? null,
        created_at: createdAt,
        updated_at: now,
        date: input.date ?? createdAt.split("T")[0],
      });
    },
    [collection],
  );

  const updateMoment = useCallback(
    async (id: number, updates: UpdateMomentInput) => {
      await collection.update(id, updates);
    },
    [collection],
  );

  return useMemo(
    () => ({
      moments: collection.items,
      loading: collection.loading,
      refreshMoments: () => collection.refresh(),
      addMoment,
      updateMoment,
      deleteMoment: collection.remove,
    }),
    [addMoment, collection, updateMoment],
  );
}
