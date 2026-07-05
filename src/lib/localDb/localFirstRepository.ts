import {
  cacheRemoteEntities,
  commitLocalMutation,
  readEntities,
  subscribeCollection,
} from "./repository";
import type { LocalCollection, SyncOperation } from "./types";

type EntityIdentity = {
  id: string | number;
  client_id?: string | null;
  user_id?: string;
  image_path?: string | null;
};

export class LocalFirstRepository<T extends EntityIdentity> {
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
      entityId: entity.id,
      payload: { ...entity, user_id: entity.user_id ?? userId },
      operation,
    });
    return entity;
  }

  async remove(userId: string, entity: T) {
    await commitLocalMutation({
      userId,
      collection: this.collection,
      entityId: entity.id,
      payload: {
        id: entity.id,
        client_id: entity.client_id ?? undefined,
        user_id: entity.user_id ?? userId,
        image_path: entity.image_path ?? undefined,
        deleted_at: new Date().toISOString(),
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
  LocalFirstRepository<EntityIdentity>
>();

export function getLocalFirstRepository<T extends EntityIdentity>(
  collection: LocalCollection,
) {
  let repository = repositories.get(collection);
  if (!repository) {
    repository = new LocalFirstRepository(collection);
    repositories.set(collection, repository);
  }
  return repository as LocalFirstRepository<T>;
}
