import type { CollectionOrder } from "./collectionSchemas";
import type { LocalCollection } from "./types";
import { createClient } from "../supabase/server";
import {
  findRemoteCollectionRowWithClient,
  readRemoteCollectionPageWithClient,
  readRemoteCollectionWithClient,
  type RemoteCollectionReadOptions,
} from "./remoteReaderCore";

export async function readRemoteCollectionServer<T extends object>(
  userId: string,
  collection: LocalCollection,
  order?: CollectionOrder,
  options?: RemoteCollectionReadOptions,
) {
  const supabase = await createClient();
  return readRemoteCollectionWithClient<T>(
    supabase,
    userId,
    collection,
    order,
    options,
  );
}

export async function readRemoteCollectionPageServer<T extends object>(
  userId: string,
  collection: LocalCollection,
  options: RemoteCollectionReadOptions & { limit: number },
  order?: CollectionOrder,
) {
  const supabase = await createClient();
  return readRemoteCollectionPageWithClient<T>(
    supabase,
    userId,
    collection,
    options,
    order,
  );
}

export async function findRemoteCollectionRowServer<T extends object>(
  collection: LocalCollection,
  column: string,
  value: string | number,
) {
  const supabase = await createClient();
  return findRemoteCollectionRowWithClient<T>(
    supabase,
    collection,
    column,
    value,
  );
}
