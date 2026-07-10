"use client";

import { useCallback, useMemo } from "react";
import { createEntityId } from "@/domain/ids";
import { hasUnresolvedSyncIssue } from "@/domain/sync";
import { useDataMutation } from "@/data";
import { useSyncedResource } from "@/data/react/useSyncedResource";
import type {
  CreateReflectionInput,
  ReflectionRecord,
  UpdateReflectionInput,
} from "../types";

type UseReflectionsInput = {
  userId: string | null;
  fullHistory?: boolean;
};

export function useReflections({
  userId,
  fullHistory = false,
}: UseReflectionsInput) {
  const resource = useSyncedResource(userId, "reflections", {
    fullHistory,
  });
  const mutation = useDataMutation(userId ?? "anonymous", "reflections");

  const requireUser = useCallback(() => {
    if (!userId) throw new Error("请先登录");
    return userId;
  }, [userId]);

  const refreshReflections = useCallback(async () => {
    requireUser();
    await resource.refresh();
  }, [requireUser, resource]);

  const createReflection = useCallback(
    async (input: CreateReflectionInput) => {
      const activeUserId = requireUser();
      const now = new Date().toISOString();
      const clientId = input.clientId ?? createEntityId("reflection");
      const title = input.title.trim();
      const body = input.body.trim();
      if (!title) throw new Error("感悟标题不能为空");
      if (!body) throw new Error("感悟内容不能为空");
      const optimistic: ReflectionRecord = {
        clientId,
        userId: activeUserId,
        version: 0,
        createdAt: now,
        updatedAt: now,
        title,
        body,
      };

      await mutation.mutateAsync({
        kind: "create",
        clientId,
        baseVersion: null,
        optimistic,
        changes: {
          title: optimistic.title,
          body: optimistic.body,
        },
      });
    },
    [mutation, requireUser],
  );

  const updateReflection = useCallback(
    async (clientId: string, input: UpdateReflectionInput) => {
      requireUser();
      const current = resource.items.find((item) => item.clientId === clientId);
      if (!current) throw new Error("感悟不存在或已删除");
      if (hasUnresolvedSyncIssue(current)) {
        throw new Error("请先在设置中处理这条感悟的同步冲突");
      }

      const changes: UpdateReflectionInput = {};
      if (input.title !== undefined) {
        const title = input.title.trim();
        if (!title) throw new Error("感悟标题不能为空");
        changes.title = title;
      }
      if (input.body !== undefined) {
        const body = input.body.trim();
        if (!body) throw new Error("感悟内容不能为空");
        changes.body = body;
      }
      if (Object.keys(changes).length === 0) return;
      const optimistic: ReflectionRecord = {
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
      });
    },
    [mutation, requireUser, resource.items],
  );

  const deleteReflection = useCallback(
    async (clientId: string) => {
      requireUser();
      const current = resource.items.find((item) => item.clientId === clientId);
      if (!current) return;
      if (hasUnresolvedSyncIssue(current)) {
        throw new Error("请先在设置中处理这条感悟的同步冲突");
      }
      await mutation.mutateAsync({
        kind: "delete",
        clientId,
        baseVersion: current.version,
        optimistic: current,
      });
    },
    [mutation, requireUser, resource.items],
  );

  return useMemo(
    () => ({
      reflections: resource.items,
      loading: resource.loading,
      hasMore: resource.hasMore,
      loadingMore: resource.loadingMore,
      loadMore: resource.loadMore,
      error: resource.error,
      refreshReflections,
      createReflection,
      updateReflection,
      deleteReflection,
    }),
    [
      createReflection,
      deleteReflection,
      refreshReflections,
      resource.error,
      resource.hasMore,
      resource.items,
      resource.loadMore,
      resource.loading,
      resource.loadingMore,
      updateReflection,
    ],
  );
}
