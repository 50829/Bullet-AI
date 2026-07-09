import { createClientId } from "../localDb/repository";
import type { LocalCollection } from "../localDb/types";
import type { LocalFirstMeta } from "./types";
import { createOptimisticId } from "./ids";

export type RepositoryEntity = {
  id?: number | string | null;
  client_id?: string | null;
  user_id?: string;
  image_path?: string | null;
  [key: string]: unknown;
};

export function ensureLocalFields<
  T extends LocalFirstMeta & {
    id?: number;
    user_id?: string;
    created_at?: string;
  },
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
    id: item.id ?? createOptimisticId(),
    user_id: item.user_id ?? userId ?? undefined,
    client_id: item.client_id || createClientId(prefix),
    created_at: item.created_at || now,
    updated_at: now,
    deleted_at: item.deleted_at ?? null,
  };
}
