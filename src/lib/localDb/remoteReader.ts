import {
  defaultOrderFor,
  selectColumnsFor,
  storageBucketFor,
  usesSoftDelete,
  type CollectionOrder,
} from "./collectionSchemas";
import type { LocalCollection } from "./types";
import { supabase } from "../supabaseClient";

const signedImageUrlCache = new Map<
  string,
  { url: string; expiresAt: number }
>();
const SIGNED_IMAGE_URL_TTL_MS = 55 * 60 * 1000;

export function clearSignedImageUrlCache() {
  signedImageUrlCache.clear();
}

function visibleRemoteRows<T extends { deleted_at?: string | null }>(
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

type RemoteImageEntity = {
  image_path?: string | null;
};

export type RemoteCollectionReadOptions = {
  limit?: number;
  offset?: number;
  includeSignedImageUrls?: boolean;
};

export type RemoteCollectionPage<T> = {
  items: T[];
  hasMore: boolean;
  nextOffset: number;
};

async function attachSignedUrls<T extends object>(
  collection: LocalCollection,
  items: T[],
) {
  const bucket = storageBucketFor(collection);
  if (!bucket) return items;

  return Promise.all(
    items.map(async (item) => {
      const imagePath = (item as RemoteImageEntity).image_path;

      return {
        ...item,
        image_url: imagePath
          ? await getSignedImageUrl(bucket, imagePath)
          : null,
      };
    }),
  );
}

async function readRemoteCollectionRows<T extends object>(
  userId: string,
  collection: LocalCollection,
  order: CollectionOrder = defaultOrderFor(collection),
  options?: RemoteCollectionReadOptions,
) {
  let query = supabase
    .from(collection)
    .select(selectColumnsFor(collection))
    .eq("user_id", userId);

  if (usesSoftDelete(collection)) {
    query = query.is("deleted_at", null);
  }

  let orderedQuery = query.order(order.column, {
    ascending: order.ascending,
  });

  if (typeof options?.limit === "number") {
    const offset = options.offset ?? 0;
    orderedQuery = orderedQuery.range(offset, offset + options.limit - 1);
  }

  const { data, error } = await orderedQuery;

  if (error) throw new Error(error.message);

  return visibleRemoteRows(
    (data ?? []) as unknown as Array<T & { deleted_at?: string | null }>,
  ) as T[];
}

export async function readRemoteCollection<T extends object>(
  userId: string,
  collection: LocalCollection,
  order: CollectionOrder = defaultOrderFor(collection),
  options?: RemoteCollectionReadOptions,
) {
  const rows = await readRemoteCollectionRows<T>(
    userId,
    collection,
    order,
    options,
  );

  if (options?.includeSignedImageUrls === false) return rows;
  return attachSignedUrls(collection, rows);
}

export async function readRemoteCollectionPage<T extends object>(
  userId: string,
  collection: LocalCollection,
  options: RemoteCollectionReadOptions & { limit: number },
  order: CollectionOrder = defaultOrderFor(collection),
): Promise<RemoteCollectionPage<T>> {
  const offset = options.offset ?? 0;
  const rows = await readRemoteCollectionRows<T>(userId, collection, order, {
    ...options,
    offset,
    limit: options.limit + 1,
  });
  const pageRows = rows.slice(0, options.limit);
  const items =
    options.includeSignedImageUrls === false
      ? pageRows
      : await attachSignedUrls(collection, pageRows);

  return {
    items,
    hasMore: rows.length > options.limit,
    nextOffset: offset + pageRows.length,
  };
}

export async function findRemoteCollectionRow<T extends object>(
  collection: LocalCollection,
  column: string,
  value: string | number,
) {
  const { data, error } = await supabase
    .from(collection)
    .select(selectColumnsFor(collection))
    .eq(column, value)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data ?? null) as unknown as T | null;
}
