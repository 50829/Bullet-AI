"use client";

import { useCallback, useMemo } from "react";
import { createEntityId } from "@/domain/ids";
import { hasUnresolvedSyncIssue } from "@/domain/sync";
import type { MomentEntity } from "@/domain/entities";
import { useDataMutation, useDataRuntime } from "@/data";
import { useSyncedResource } from "@/data/react/useSyncedResource";
import type {
  CreateMomentInput,
  MomentRecord,
  UpdateMomentInput,
} from "../types";
import { useMomentImageUrls } from "./useMomentImageUrls";

type UseMomentsInput = {
  userId: string | null;
  fullHistory?: boolean;
};

function blobFileName(blob: Blob, requestedName?: string | null) {
  if (requestedName) return requestedName;
  const namedBlob = blob as Blob & { name?: unknown };
  return typeof namedBlob.name === "string" && namedBlob.name
    ? namedBlob.name
    : "moment-image.jpg";
}

export function useMoments({ userId, fullHistory = false }: UseMomentsInput) {
  const resource = useSyncedResource(userId, "moments", {
    fullHistory,
  });
  const mutation = useDataMutation(userId ?? "anonymous", "moments");
  const { store } = useDataRuntime();
  const media = useMomentImageUrls({
    userId,
    moments: resource.items,
    store,
  });

  const requireUser = useCallback(() => {
    if (!userId) throw new Error("请先登录");
    return userId;
  }, [userId]);

  const refreshMoments = useCallback(async () => {
    requireUser();
    await resource.refresh();
  }, [requireUser, resource]);

  const createMoment = useCallback(
    async (input: CreateMomentInput) => {
      const activeUserId = requireUser();
      const now = new Date().toISOString();
      const clientId = input.clientId ?? createEntityId("moment");
      const imageFile = input.imageFile ?? null;
      const content = input.content.trim();
      if (!content) throw new Error("记录内容不能为空");
      if (!input.occurredOn) throw new Error("记录日期不能为空");
      const optimistic: MomentEntity = {
        clientId,
        userId: activeUserId,
        version: 0,
        createdAt: now,
        updatedAt: now,
        content,
        occurredOn: input.occurredOn,
        imagePath: input.imagePath ?? null,
      };

      await mutation.mutateAsync({
        kind: "create",
        clientId,
        baseVersion: null,
        optimistic,
        changes: {
          content: optimistic.content,
          occurredOn: optimistic.occurredOn,
          imagePath: optimistic.imagePath,
        },
        blobs: imageFile
          ? [
              {
                slot: "image",
                blob: imageFile,
                fileName: blobFileName(imageFile, input.imageFileName),
              },
            ]
          : undefined,
      });
    },
    [mutation, requireUser],
  );

  const updateMoment = useCallback(
    async (clientId: string, input: UpdateMomentInput) => {
      requireUser();
      const current = resource.items.find((item) => item.clientId === clientId);
      if (!current) throw new Error("记录不存在或已删除");
      if (hasUnresolvedSyncIssue(current)) {
        throw new Error("请先在设置中处理这条记录的同步冲突");
      }

      const imageFile = input.imageFile ?? null;
      const changes: Partial<
        Pick<MomentEntity, "content" | "occurredOn" | "imagePath">
      > = {};
      if (input.content !== undefined) {
        const content = input.content.trim();
        if (!content) throw new Error("记录内容不能为空");
        changes.content = content;
      }
      if (input.occurredOn !== undefined) {
        if (!input.occurredOn) throw new Error("记录日期不能为空");
        changes.occurredOn = input.occurredOn;
      }
      if (input.imagePath !== undefined) changes.imagePath = input.imagePath;
      if (imageFile) {
        changes.imagePath = null;
      }
      if (Object.keys(changes).length === 0) return;

      const optimistic: MomentEntity = {
        ...current,
        ...changes,
        updatedAt: new Date().toISOString(),
      };

      await mutation.mutateAsync({
        kind: "patch",
        clientId,
        baseVersion: current.version,
        optimistic,
        changes,
        cleanup:
          imageFile || input.imagePath !== undefined
            ? { momentImagePath: current.imagePath }
            : undefined,
        blobs: imageFile
          ? [
              {
                slot: "image",
                blob: imageFile,
                fileName: blobFileName(imageFile, input.imageFileName),
              },
            ]
          : undefined,
      });
    },
    [mutation, requireUser, resource.items],
  );

  const deleteMoment = useCallback(
    async (clientId: string) => {
      requireUser();
      const current = resource.items.find((item) => item.clientId === clientId);
      if (!current) return;
      if (hasUnresolvedSyncIssue(current)) {
        throw new Error("请先在设置中处理这条记录的同步冲突");
      }
      await mutation.mutateAsync({
        kind: "delete",
        clientId,
        baseVersion: current.version,
        optimistic: current,
        cleanup: { momentImagePath: current.imagePath },
      });
    },
    [mutation, requireUser, resource.items],
  );

  const moments = useMemo(
    () =>
      resource.items.map((moment): MomentRecord => ({
        ...moment,
        imageUrl: media.imageUrls.get(moment.clientId) ?? null,
      })),
    [media.imageUrls, resource.items],
  );

  return useMemo(
    () => ({
      moments,
      loading: resource.loading,
      hasMore: resource.hasMore,
      loadingMore: resource.loadingMore,
      loadMore: resource.loadMore,
      error: resource.error ?? media.error,
      refreshMoments,
      createMoment,
      updateMoment,
      deleteMoment,
    }),
    [
      createMoment,
      deleteMoment,
      refreshMoments,
      media.error,
      resource.error,
      resource.hasMore,
      resource.loadMore,
      resource.loading,
      resource.loadingMore,
      moments,
      updateMoment,
    ],
  );
}
