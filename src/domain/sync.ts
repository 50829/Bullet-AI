import type { VersionedEntity } from "./entities";

export function hasUnresolvedSyncIssue(entity: Pick<VersionedEntity, "sync">) {
  return Boolean(entity.sync?.blocked || entity.sync?.conflict);
}
