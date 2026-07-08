import { supabase } from "../../lib/supabaseClient";
import { getLocalFirstRepository } from "../../lib/localDb/localFirstRepository";
import { createClientId } from "../../lib/localDb/repository";
import type { LocalCollection } from "../../lib/localDb/types";
import type { LocalMeta, WorkspaceEntity } from "./types";

const signedImageUrlCache = new Map<
  string,
  { url: string; expiresAt: number }
>();
const SIGNED_IMAGE_URL_TTL_MS = 55 * 60 * 1000;

export type RepositoryEntity = {
  id?: number | string | null;
  client_id?: string | null;
  user_id?: string;
  image_path?: string | null;
  [key: string]: unknown;
};

export function repositoryFor(collection: LocalCollection) {
  return getLocalFirstRepository<RepositoryEntity>(collection);
}

export function formatDate(dateString: string) {
  const date = new Date(dateString);
  const locale =
    typeof navigator === "undefined" ? undefined : navigator.language;
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function sortByCreatedAtDesc<T extends { created_at?: string }>(
  items: T[],
) {
  return [...items].sort(
    (a, b) =>
      new Date(b.created_at ?? 0).getTime() -
      new Date(a.created_at ?? 0).getTime(),
  );
}

export function withFormattedDate<
  T extends { created_at?: string; updated_at?: string },
>(item: T) {
  const createdAt = item.created_at || new Date().toISOString();
  return {
    ...item,
    created_at: createdAt,
    updated_at: item.updated_at || createdAt,
    date: formatDate(createdAt),
  };
}

export function ensureLocalFields<
  T extends LocalMeta & { id?: number; user_id?: string; created_at?: string },
>(
  collection: LocalCollection,
  item: T,
  userId: string | null,
): T & {
  id: number;
  client_id: string;
  created_at: string;
  updated_at: string;
} {
  const now = new Date().toISOString();
  const prefix = collection.replace(/s$/, "");
  return {
    ...item,
    id: item.id ?? Date.now(),
    user_id: item.user_id ?? userId ?? undefined,
    client_id: item.client_id || createClientId(prefix),
    created_at: item.created_at || now,
    updated_at: now,
    deleted_at: item.deleted_at ?? null,
  };
}

export function visibleRemoteRows<T extends { deleted_at?: string | null }>(
  items: T[] | null,
) {
  return (items ?? []).filter((item) => !item.deleted_at);
}

async function getSignedImageUrl(bucket: string, imagePath?: string | null) {
  if (!imagePath) return null;

  const cacheKey = `${bucket}:${imagePath}`;
  const cached = signedImageUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const result = await supabase.storage
    .from(bucket)
    .createSignedUrl(imagePath, 60 * 60);
  if (result.error || !result.data) return null;
  const signedUrl = result.data.signedUrl ?? null;
  if (signedUrl) {
    signedImageUrlCache.set(cacheKey, {
      url: signedUrl,
      expiresAt: Date.now() + SIGNED_IMAGE_URL_TTL_MS,
    });
  }

  return signedUrl;
}

export async function attachSignedUrls<T extends WorkspaceEntity>(
  bucket: "moments" | "reflections" | "goals",
  items: T[],
) {
  return Promise.all(
    items.map(async (item) => ({
      ...withFormattedDate(item),
      image_url: item.image_path
        ? await getSignedImageUrl(bucket, item.image_path)
        : null,
    })),
  );
}

export function stripLocalFields<T extends Record<string, unknown>>(value: T) {
  const payload = { ...value };
  delete payload._local;
  delete payload.date;
  delete payload.image_url;
  return payload;
}
