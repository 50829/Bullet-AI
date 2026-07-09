import {
  cacheRemoteEntities,
  commitLocalMutation,
  readEntities,
  subscribeCollection,
} from "./repository";
import { identityValueFor } from "./collectionSchemas";
import type { LocalCollection, SyncOperation } from "./types";

type EntityIdentity = {
  id?: string | number | null;
  client_id?: string | null;
  user_id?: string;
  image_path?: string | null;
  deleted_at?: string | null;
};

function entityIdentity(
  collection: LocalCollection,
  entity: EntityIdentity & Record<string, unknown>,
) {
  return identityValueFor(collection, entity);
}

export class CollectionRepository<T extends EntityIdentity & Record<string, unknown>> {
  constructor(readonly collection: LocalCollection) {}

  list(userId: string) {
    return readEntities<T>(userId, this.collection);
  }

  async replaceRemote(userId: string, rows: T[]) {
    await cacheRemoteEntities(userId, this.collection, rows, {
      pruneMissing: true,
    });
    return this.list(userId);
  }

  async mutate(
    userId: string,
    entity: T,
    operation: Exclude<SyncOperation, "delete"> = "update",
  ) {
    await commitLocalMutation({
      userId,
      collection: this.collection,
      entityId: entityIdentity(this.collection, entity),
      payload: { ...entity, user_id: entity.user_id ?? userId },
      operation,
    });
    return entity;
  }

  async remove(userId: string, entity: T) {
    await commitLocalMutation({
      userId,
      collection: this.collection,
      entityId: entityIdentity(this.collection, entity),
      payload: {
        id: entity.id,
        client_id: entity.client_id ?? undefined,
        user_id: entity.user_id ?? userId,
        image_path: entity.image_path ?? undefined,
        deleted_at: entity.deleted_at ?? new Date().toISOString(),
      },
      operation: "delete",
      deleted: true,
    });
  }

  subscribe(userId: string, listener: () => void) {
    return subscribeCollection(userId, [this.collection], listener);
  }
}

const repositories = new Map<
  LocalCollection,
  CollectionRepository<EntityIdentity & Record<string, unknown>>
>();

export function getCollectionRepository<T extends EntityIdentity & Record<string, unknown>>(
  collection: LocalCollection,
) {
  let repository = repositories.get(collection);
  if (!repository) {
    repository = new CollectionRepository(collection);
    repositories.set(collection, repository);
  }
  return repository as CollectionRepository<T>;
}
