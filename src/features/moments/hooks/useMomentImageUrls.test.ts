import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import type { MomentEntity } from "../../../domain/entities";
import { DataV2Store } from "../../../lib/data-v2/store";
import {
  isMomentImageSourceReusable,
  loadMomentImageSources,
} from "./useMomentImageUrls";

const stores: DataV2Store[] = [];

function moment(imagePath: string | null): MomentEntity {
  return {
    userId: "user-1",
    clientId: "moment-1",
    version: 1,
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
    content: "moment",
    occurredOn: "2026-07-10",
    imagePath,
  };
}

function createStore() {
  const store = new DataV2Store({
    databaseName: `moment-images-${crypto.randomUUID()}`,
  });
  stores.push(store);
  return store;
}

afterEach(async () => {
  await Promise.all(stores.splice(0).map((store) => store.deleteDatabase()));
});

describe("loadMomentImageSources", () => {
  it("uses a durable pending blob before the remote image path", async () => {
    const store = createStore();
    const entity = moment("user-1/moment-1/old.jpg");
    await store.putSnapshot("moments", entity);
    await store.enqueueMutation({
      userId: "user-1",
      resource: "moments",
      clientId: "moment-1",
      kind: "patch",
      baseVersion: 1,
      optimistic: { ...entity, imagePath: null },
      changes: { imagePath: null },
      blobs: [
        {
          slot: "image",
          blob: new Blob(["image"], { type: "image/jpeg" }),
          fileName: "new.jpg",
        },
      ],
    });

    await expect(
      loadMomentImageSources("user-1", [{ ...entity, imagePath: null }], store),
    ).resolves.toEqual([
      expect.objectContaining({ kind: "blob", clientId: "moment-1" }),
    ]);
  });

  it("uses the stable storage path when no local image mutation exists", async () => {
    const store = createStore();
    const entity = moment("user-1/moment-1/current.jpg");

    await expect(
      loadMomentImageSources("user-1", [entity], store),
    ).resolves.toEqual([
      {
        clientId: "moment-1",
        sourceKey: "remote:user-1/moment-1/current.jpg",
        kind: "remote",
        imagePath: "user-1/moment-1/current.jpg",
      },
    ]);
  });

  it("finds a queued image blob behind a sending content patch", async () => {
    const store = createStore();
    const entity = moment("user-1/moment-1/current.jpg");
    await store.putSnapshot("moments", entity);
    const contentPatch = await store.enqueueMutation({
      userId: "user-1",
      resource: "moments",
      clientId: "moment-1",
      kind: "patch",
      baseVersion: 1,
      optimistic: { ...entity, content: "updated" },
      changes: { content: "updated" },
    });
    await store.claimMutation(contentPatch!.mutationId);
    await store.enqueueMutation({
      userId: "user-1",
      resource: "moments",
      clientId: "moment-1",
      kind: "patch",
      baseVersion: 1,
      optimistic: { ...entity, content: "updated", imagePath: null },
      changes: { imagePath: null },
      blobs: [
        {
          slot: "image",
          blob: new Blob(["new image"], { type: "image/jpeg" }),
          fileName: "new.jpg",
        },
      ],
    });

    await expect(
      loadMomentImageSources(
        "user-1",
        [{ ...entity, content: "updated", imagePath: null }],
        store,
      ),
    ).resolves.toEqual([
      expect.objectContaining({ kind: "blob", clientId: "moment-1" }),
    ]);
  });
});

describe("isMomentImageSourceReusable", () => {
  it("refreshes a signed URL before the next timer would leave it expired", () => {
    const now = Date.parse("2026-07-10T00:50:00.000Z");

    expect(
      isMomentImageSourceReusable(
        {
          sourceKey: "remote:path.jpg",
          expiresAt: Date.parse("2026-07-10T01:00:00.000Z"),
        },
        "remote:path.jpg",
        now,
      ),
    ).toBe(false);
  });

  it("keeps blob URLs reusable until their source changes", () => {
    expect(
      isMomentImageSourceReusable(
        { sourceKey: "blob:1", expiresAt: null },
        "blob:1",
        Date.now(),
      ),
    ).toBe(true);
  });
});
