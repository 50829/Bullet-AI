import type { PostgrestError } from "@supabase/supabase-js";
import type {
  DataResource,
  EntityByResource,
  MomentEntity,
} from "../../../domain/entities";
import type {
  RemoteMutationExecutor,
  RemoteMutationRequest,
  RemoteMutationResult,
} from "../../../lib/data-v2";
import { logger } from "../../../lib/observability/logger";
import { supabase } from "../../../lib/supabase/client";
import {
  type DatabaseRow,
  fromDynamicTable,
  mapRemote,
  selectFor,
} from "./remoteResourceReaderV2";

function mutationPayload<R extends DataResource>(
  resource: R,
  request: RemoteMutationRequest<R>,
) {
  const changes = (request.changes ?? {}) as Record<string, unknown>;
  switch (resource) {
    case "profiles":
      return {
        user_id: request.userId,
        ...(Object.hasOwn(changes, "username")
          ? { username: changes.username || null }
          : {}),
        ...(Object.hasOwn(changes, "preferredLanguage")
          ? { preferred_language: changes.preferredLanguage }
          : {}),
        ...(Object.hasOwn(changes, "accentColor")
          ? { accent_color: changes.accentColor }
          : {}),
        ...(Object.hasOwn(changes, "colorScheme")
          ? { color_scheme: changes.colorScheme }
          : {}),
        ...(Object.hasOwn(changes, "completedGoalRetention")
          ? { completed_goal_retention: changes.completedGoalRetention }
          : {}),
        ...(Object.hasOwn(changes, "weekStartsOn")
          ? { week_starts_on: changes.weekStartsOn }
          : {}),
      };
    case "moments":
      return {
        client_id: request.clientId,
        user_id: request.userId,
        ...(Object.hasOwn(changes, "content")
          ? { content: changes.content }
          : {}),
        ...(Object.hasOwn(changes, "occurredOn")
          ? { occurred_on: changes.occurredOn }
          : {}),
        ...(Object.hasOwn(changes, "imagePath")
          ? { image_path: changes.imagePath }
          : {}),
      };
    case "reflections":
      return {
        client_id: request.clientId,
        user_id: request.userId,
        ...(Object.hasOwn(changes, "title") ? { title: changes.title } : {}),
        ...(Object.hasOwn(changes, "body") ? { body: changes.body } : {}),
      };
    case "goals":
      return {
        client_id: request.clientId,
        user_id: request.userId,
        ...(Object.hasOwn(changes, "title") ? { title: changes.title } : {}),
        ...(Object.hasOwn(changes, "description")
          ? { description: changes.description }
          : {}),
        ...(Object.hasOwn(changes, "dueDate")
          ? { due_date: changes.dueDate }
          : {}),
        ...(Object.hasOwn(changes, "completedAt")
          ? { completed_at: changes.completedAt }
          : {}),
        ...(Object.hasOwn(changes, "color") ? { color: changes.color } : {}),
        ...(Object.hasOwn(changes, "startedOn")
          ? { started_on: changes.startedOn }
          : {}),
        ...(Object.hasOwn(changes, "sortOrder")
          ? { sort_order: changes.sortOrder }
          : {}),
      };
    case "habits":
      return {
        client_id: request.clientId,
        user_id: request.userId,
        ...(Object.hasOwn(changes, "name") ? { name: changes.name } : {}),
        ...(Object.hasOwn(changes, "description")
          ? { description: changes.description }
          : {}),
        ...(Object.hasOwn(changes, "frequency")
          ? { frequency: changes.frequency }
          : {}),
        ...(Object.hasOwn(changes, "color") ? { color: changes.color } : {}),
      };
    case "habit_checkins":
      return {
        client_id: request.clientId,
        user_id: request.userId,
        ...(Object.hasOwn(changes, "habitClientId")
          ? { habit_client_id: changes.habitClientId }
          : {}),
        ...(Object.hasOwn(changes, "checkedOn")
          ? { checked_on: changes.checkedOn }
          : {}),
      };
  }
}

async function findRemote<R extends DataResource>(
  resource: R,
  userId: string,
  clientId: string,
  signal?: AbortSignal,
) {
  let query = fromDynamicTable(resource)
    .select(selectFor(resource))
    .eq("user_id", userId);
  query = query.eq(resource === "profiles" ? "user_id" : "client_id", clientId);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data
    ? mapRemote(resource, data as unknown as DatabaseRow)
    : Promise.resolve(null);
}

function classifyError(
  error: PostgrestError | Error,
): RemoteMutationResult<DataResource> {
  const code = "code" in error ? error.code : "";
  const message = error.message || "Remote mutation failed";
  const status = Number(
    (error as Error & { status?: number; statusCode?: number }).status ??
      (error as Error & { status?: number; statusCode?: number }).statusCode ??
      0,
  );
  if (
    code === "PGRST301" ||
    code === "42501" ||
    /jwt|auth|permission/i.test(message)
  ) {
    return { kind: "auth", error: message };
  }
  if (
    code === "40001" ||
    code === "40P01" ||
    code === "55P03" ||
    code === "57014" ||
    code === "53300" ||
    code === "57P01" ||
    code.startsWith("08") ||
    [408, 425, 429, 500, 502, 503, 504].includes(status) ||
    /abort|connection|fetch|network|rate limit|timeout|too many|unavailable/i.test(
      message,
    )
  ) {
    return { kind: "transient", error: message };
  }
  return { kind: "permanent", error: message };
}

function normalizeRemoteError(error: unknown): PostgrestError | Error {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error as PostgrestError;
  }
  return error instanceof Error ? error : new Error(String(error));
}

async function uploadMomentImage<R extends DataResource>(
  request: RemoteMutationRequest<R>,
) {
  const path = momentImagePath(request);
  if (!path) return null;
  const image = request.blobs.find((blob) => blob.slot === "image");
  if (!image) return null;
  const { error } = await supabase.storage
    .from("moments")
    .upload(path, image.blob, { cacheControl: "3600", upsert: true });
  if (error) throw error;
  return path;
}

function momentImagePath<R extends DataResource>(
  request: RemoteMutationRequest<R>,
) {
  if (request.resource !== "moments") return null;
  const image = request.blobs.find((blob) => blob.slot === "image");
  if (!image) return null;
  const extension = image.fileName.split(".").pop()?.toLowerCase() || "jpg";
  return `${request.userId}/${request.clientId}/${request.mutationId}.${extension}`;
}

const PERSISTED_CHANGE_KEYS = {
  profiles: [
    "username",
    "preferredLanguage",
    "accentColor",
    "colorScheme",
    "completedGoalRetention",
    "weekStartsOn",
  ],
  moments: ["content", "occurredOn", "imagePath"],
  reflections: ["title", "body"],
  goals: [
    "title",
    "description",
    "dueDate",
    "completedAt",
    "color",
    "sortOrder",
  ],
  habits: ["name", "description", "frequency", "color", "startedOn"],
  habit_checkins: ["habitClientId", "checkedOn"],
} as const satisfies Record<DataResource, readonly string[]>;

function patchWasAlreadyApplied<R extends DataResource>(
  request: RemoteMutationRequest<R>,
  existing: EntityByResource[R],
) {
  if (
    request.kind !== "patch" ||
    request.baseVersion === null ||
    existing.version !== request.baseVersion + 1
  ) {
    return false;
  }
  const changes = (request.changes ?? {}) as Record<string, unknown>;
  const remote = existing as unknown as Record<string, unknown>;
  const expectedImagePath = momentImagePath(request);
  return PERSISTED_CHANGE_KEYS[request.resource].every((key) => {
    if (key === "imagePath" && expectedImagePath) {
      return remote[key] === expectedImagePath;
    }
    return !Object.hasOwn(changes, key) || remote[key] === changes[key];
  });
}

async function removeMomentImage(path: string | null | undefined) {
  if (!path) return null;
  const { error } = await supabase.storage.from("moments").remove([path]);
  if (error) logger.warn("moment_image_cleanup_failed", { path, error });
  return error;
}

function referencesMomentImage(
  entity: EntityByResource[DataResource] | null,
  path: string | null,
) {
  return Boolean(
    path && entity && (entity as Partial<MomentEntity>).imagePath === path,
  );
}

async function removeMomentImageIfUnreferenced(
  path: string | null,
  entity: EntityByResource[DataResource] | null,
) {
  if (!path || referencesMomentImage(entity, path)) return null;
  return removeMomentImage(path);
}

function cleanupFailure<R extends DataResource>(error: PostgrestError | Error) {
  return classifyError(error) as RemoteMutationResult<R>;
}

async function cleanupAppliedMomentPatch<R extends DataResource>(
  request: RemoteMutationRequest<R>,
  entity: EntityByResource[R],
) {
  if (request.resource !== "moments") return null;
  return removeMomentImageIfUnreferenced(
    request.cleanup?.momentImagePath ?? null,
    entity,
  );
}

export class SupabaseRemoteMutationExecutor implements RemoteMutationExecutor {
  async execute<R extends DataResource>(
    request: RemoteMutationRequest<R>,
    signal: AbortSignal,
  ): Promise<RemoteMutationResult<R>> {
    try {
      const existing = await findRemote(
        request.resource,
        request.userId,
        request.clientId,
        signal,
      );
      if (request.kind === "create" && existing) {
        const cleanupError = await removeMomentImageIfUnreferenced(
          momentImagePath(request),
          existing,
        );
        if (cleanupError) return cleanupFailure<R>(cleanupError);
        return { kind: "applied", entity: existing };
      }
      if (existing && patchWasAlreadyApplied(request, existing)) {
        const cleanupError = await cleanupAppliedMomentPatch(request, existing);
        if (cleanupError) return cleanupFailure<R>(cleanupError);
        return { kind: "applied", entity: existing };
      }
      if (request.kind === "delete") {
        const imagePath =
          request.resource === "moments"
            ? (request.cleanup?.momentImagePath ??
              ((existing ?? request.optimistic) as MomentEntity).imagePath)
            : null;
        if (!existing) {
          const cleanupError = await removeMomentImage(imagePath);
          return cleanupError
            ? cleanupFailure<R>(cleanupError)
            : { kind: "applied", entity: null };
        }
        if (existing.version !== request.baseVersion) {
          return {
            kind: "conflict",
            remote: existing,
            reason: "Remote record changed before delete",
          };
        }
        const { data, error } = await fromDynamicTable(request.resource)
          .delete()
          .eq("user_id", request.userId)
          .eq(
            request.resource === "profiles" ? "user_id" : "client_id",
            request.clientId,
          )
          .eq("version", request.baseVersion!)
          .abortSignal(signal)
          .select(selectFor(request.resource))
          .maybeSingle();
        if (error) return classifyError(error) as RemoteMutationResult<R>;
        if (!data) {
          const remote = await findRemote(
            request.resource,
            request.userId,
            request.clientId,
            signal,
          );
          if (remote) {
            return {
              kind: "conflict",
              remote,
              reason: "Remote record changed before delete",
            };
          }
          const cleanupError = await removeMomentImage(imagePath);
          return cleanupError
            ? cleanupFailure<R>(cleanupError)
            : { kind: "applied", entity: null };
        }
        const cleanupError = await removeMomentImage(imagePath);
        if (cleanupError) {
          return cleanupFailure<R>(cleanupError);
        }
        return { kind: "applied", entity: null };
      }

      const uploadedPath = await uploadMomentImage(request);
      const payload = mutationPayload(request.resource, request) as DatabaseRow;
      if (uploadedPath) payload.image_path = uploadedPath;

      if (request.kind === "create") {
        const { data, error } = await fromDynamicTable(request.resource)
          .insert(payload)
          .select(selectFor(request.resource))
          .abortSignal(signal)
          .single();
        if (error) {
          if (error.code === "23505") {
            const duplicate = await findRemote(
              request.resource,
              request.userId,
              request.clientId,
              signal,
            );
            if (duplicate) {
              const cleanupError = await removeMomentImageIfUnreferenced(
                uploadedPath,
                duplicate,
              );
              return cleanupError
                ? cleanupFailure<R>(cleanupError)
                : { kind: "applied", entity: duplicate };
            }
          }
          const result = classifyError(error) as RemoteMutationResult<R>;
          if (uploadedPath && result.kind !== "transient") {
            const cleanupError = await removeMomentImageIfUnreferenced(
              uploadedPath,
              existing,
            );
            if (cleanupError) return cleanupFailure<R>(cleanupError);
          }
          return result;
        }
        return {
          kind: "applied",
          entity: await mapRemote(
            request.resource,
            data as unknown as DatabaseRow,
          ),
        };
      }

      if (!existing) {
        if (uploadedPath) {
          const cleanupError = await removeMomentImageIfUnreferenced(
            uploadedPath,
            null,
          );
          if (cleanupError) return cleanupFailure<R>(cleanupError);
        }
        return {
          kind: "conflict",
          remote: null,
          reason: "Remote record was deleted",
        };
      }
      if (existing.version !== request.baseVersion) {
        if (uploadedPath) {
          const cleanupError = await removeMomentImageIfUnreferenced(
            uploadedPath,
            existing,
          );
          if (cleanupError) return cleanupFailure<R>(cleanupError);
        }
        return {
          kind: "conflict",
          remote: existing,
          reason: "Remote record changed",
        };
      }
      delete payload.client_id;
      delete payload.user_id;
      const { data, error } = await fromDynamicTable(request.resource)
        .update(payload)
        .eq("user_id", request.userId)
        .eq(
          request.resource === "profiles" ? "user_id" : "client_id",
          request.clientId,
        )
        .eq("version", request.baseVersion)
        .abortSignal(signal)
        .select(selectFor(request.resource))
        .maybeSingle();
      if (error) {
        const result = classifyError(error) as RemoteMutationResult<R>;
        if (uploadedPath && result.kind !== "transient") {
          const cleanupError = await removeMomentImageIfUnreferenced(
            uploadedPath,
            existing,
          );
          if (cleanupError) return cleanupFailure<R>(cleanupError);
        }
        return result;
      }
      if (!data) {
        const remote = await findRemote(
          request.resource,
          request.userId,
          request.clientId,
          signal,
        );
        if (uploadedPath) {
          const cleanupError = await removeMomentImageIfUnreferenced(
            uploadedPath,
            remote,
          );
          if (cleanupError) return cleanupFailure<R>(cleanupError);
        }
        return {
          kind: "conflict",
          remote,
          reason: "Remote record changed",
        };
      }
      const entity = await mapRemote(
        request.resource,
        data as unknown as DatabaseRow,
      );
      if (
        request.resource === "moments" &&
        (uploadedPath || Object.hasOwn(request.changes ?? {}, "imagePath"))
      ) {
        const cleanupError = await removeMomentImageIfUnreferenced(
          request.cleanup?.momentImagePath ??
            (existing as MomentEntity).imagePath,
          entity,
        );
        if (cleanupError) return cleanupFailure<R>(cleanupError);
      }
      return { kind: "applied", entity };
    } catch (error) {
      return classifyError(
        normalizeRemoteError(error),
      ) as RemoteMutationResult<R>;
    }
  }
}
