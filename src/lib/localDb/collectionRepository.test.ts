import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cacheRemoteEntities: vi.fn(),
  commitLocalMutation: vi.fn(),
}));

vi.mock("./repository", () => ({
  cacheRemoteEntities: mocks.cacheRemoteEntities,
  commitLocalMutation: mocks.commitLocalMutation,
  readEntities: vi.fn(),
  subscribeCollection: vi.fn(),
}));

const { CollectionRepository } = await import("./collectionRepository");

describe("CollectionRepository", () => {
  beforeEach(() => {
    mocks.cacheRemoteEntities.mockReset();
    mocks.commitLocalMutation.mockReset();
  });

  it("can cache partial remote pages without pruning missing rows", async () => {
    const repository = new CollectionRepository<{
      id: number;
      client_id: string;
      user_id: string;
    }>("moments");

    await repository.cacheRemote("user-id", [
      { id: 1, client_id: "moment-client-id", user_id: "user-id" },
    ]);

    expect(mocks.cacheRemoteEntities).toHaveBeenCalledWith(
      "user-id",
      "moments",
      [{ id: 1, client_id: "moment-client-id", user_id: "user-id" }],
      { pruneMissing: false },
    );
  });

  it("keeps the entity image path when queuing a delete mutation", async () => {
    const repository = new CollectionRepository<{
      id: number;
      client_id: string;
      user_id: string;
      image_path: string;
    }>("moments");

    await repository.remove("user-id", {
      id: 1,
      client_id: "moment-client-id",
      user_id: "user-id",
      image_path: "user-id/photo.jpg",
    });

    expect(mocks.commitLocalMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-id",
        collection: "moments",
        entityId: "moment-client-id",
        operation: "delete",
        deleted: true,
        payload: expect.objectContaining({
          id: 1,
          client_id: "moment-client-id",
          user_id: "user-id",
          image_path: "user-id/photo.jpg",
        }),
      }),
    );
  });
});
