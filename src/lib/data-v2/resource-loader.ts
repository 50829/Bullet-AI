import type { DataV2StoreApi } from "./store";
import type { DataResource, EntityByResource, OverlayRecord } from "./types";

type LocalFirstResourceInput<R extends DataResource> = {
  store: DataV2StoreApi;
  userId: string;
  resource: R;
  online: boolean;
  remoteLoader?: () => Promise<
    EntityByResource[R][] | { kind: "snapshots-managed" }
  >;
  onBackgroundRefresh: (records: OverlayRecord<R>[]) => void;
  onBackgroundError?: (error: unknown) => void;
};

export async function loadLocalFirstResource<R extends DataResource>({
  store,
  userId,
  resource,
  online,
  remoteLoader,
  onBackgroundRefresh,
  onBackgroundError,
}: LocalFirstResourceInput<R>) {
  const sessionToken = store.getUserSessionToken(userId);
  const [overlay, snapshots, hasLoadedCollection] = await Promise.all([
    store.readOverlayCollection(userId, resource),
    store.readCollection(userId, resource),
    store.hasLoadedCollection(userId, resource),
  ]);
  if (!remoteLoader || !online) return overlay;

  const refreshRemote = async () => {
    const readStartedAt = new Date().toISOString();
    const remote = await remoteLoader();
    if (!Array.isArray(remote)) {
      return store.readOverlayCollection(userId, resource);
    }
    await store.replaceSnapshots(userId, resource, remote, {
      notify: false,
      readStartedAt,
      sessionToken,
    });
    return store.readOverlayCollection(userId, resource);
  };

  if (overlay.length > 0 || snapshots.length > 0 || hasLoadedCollection) {
    void refreshRemote()
      .then(onBackgroundRefresh)
      .catch((error) => onBackgroundError?.(error));
    return overlay;
  }

  return refreshRemote();
}
