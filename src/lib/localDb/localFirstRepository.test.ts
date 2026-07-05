import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  commitLocalMutation: vi.fn(),
}));

vi.mock("./repository", () => ({
  cacheRemoteEntities: vi.fn(),
  commitLocalMutation: mocks.commitLocalMutation,
  readEntities: vi.fn(),
  subscribeCollection: vi.fn(),
}));

const { LocalFirstRepository } = await import("./localFirstRepository");

describe("LocalFirstRepository", () => {
  beforeEach(() => {
    mocks.commitLocalMutation.mockReset();
  });

  it("keeps the entity image path when queuing a delete mutation", async () => {
    const repository = new LocalFirstRepository<{
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
        entityId: 1,
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
