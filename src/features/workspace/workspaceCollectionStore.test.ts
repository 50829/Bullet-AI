import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MomentRecord } from "./types";

const mocks = vi.hoisted(() => ({
  remoteRows: [] as MomentRecord[],
  repository: {
    list: vi.fn(),
    mutate: vi.fn(),
    remove: vi.fn(),
    replaceRemote: vi.fn(),
  },
  flushOutbox: vi.fn(),
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../../lib/localDb/localFirstRepository", () => ({
  getLocalFirstRepository: vi.fn(() => mocks.repository),
}));

vi.mock("../../lib/localDb/syncEngine", () => ({
  flushOutbox: mocks.flushOutbox,
}));

vi.mock("../../lib/observability/logger", () => ({
  logger: mocks.logger,
}));

vi.mock("../../lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(() => {
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        is: vi.fn(() => builder),
        order: vi.fn(async () => ({
          data: mocks.remoteRows,
          error: null,
        })),
      };
      return builder;
    }),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn(async () => ({
          data: { signedUrl: "https://signed.example/image.jpg" },
          error: null,
        })),
      })),
    },
  },
}));

const { WorkspaceCollectionStore } = await import("./workspaceCollectionStore");

function moment(overrides: Partial<MomentRecord>): MomentRecord {
  return {
    id: 1,
    client_id: "moment-1",
    user_id: "user-1",
    content: "cached",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    image_url: null,
    image_path: null,
    ...overrides,
  };
}

async function flushAsync() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
}

describe("WorkspaceCollectionStore", () => {
  beforeEach(() => {
    mocks.remoteRows = [];
    mocks.repository.list.mockReset();
    mocks.repository.mutate.mockReset();
    mocks.repository.remove.mockReset();
    mocks.repository.replaceRemote.mockReset();
    mocks.flushOutbox.mockReset();
    mocks.logger.error.mockReset();
    mocks.logger.info.mockReset();
    mocks.logger.warn.mockReset();
  });

  it("shows cached rows before replacing them with the remote snapshot", async () => {
    const cached = moment({ id: 1, content: "cached" });
    const remote = moment({ id: 2, client_id: "moment-2", content: "remote" });
    mocks.repository.list.mockResolvedValue([cached]);
    mocks.remoteRows = [remote];
    mocks.repository.replaceRemote.mockResolvedValue([remote]);
    const store = WorkspaceCollectionStore.create<MomentRecord>({
      collection: "moments",
    });
    const snapshots: Array<ReturnType<typeof store.getSnapshot>> = [];
    store.subscribe(() => snapshots.push(store.getSnapshot()));

    store.setUserId("user-1");
    await flushAsync();

    expect(
      snapshots.some(
        (snapshot) =>
          snapshot.items[0]?.content === "cached" && !snapshot.loading,
      ),
    ).toBe(true);
    expect(store.getSnapshot().items).toEqual([
      expect.objectContaining({ content: "remote" }),
    ]);
  });

  it("clears old user rows immediately when the active user changes", async () => {
    const cached = moment({ id: 1, content: "cached" });
    mocks.repository.list.mockResolvedValue([cached]);
    mocks.repository.replaceRemote.mockResolvedValue([cached]);
    const store = WorkspaceCollectionStore.create<MomentRecord>({
      collection: "moments",
    });

    store.setUserId("user-1");
    await flushAsync();
    store.setUserId("user-2");

    expect(store.getSnapshot()).toMatchObject({
      userId: "user-2",
      items: [],
      loading: true,
    });
  });

  it("removes rows optimistically and queues a delete mutation", async () => {
    const cached = moment({ id: 1, content: "cached" });
    mocks.repository.list.mockResolvedValue([cached]);
    mocks.repository.replaceRemote.mockResolvedValue([cached]);
    const store = WorkspaceCollectionStore.create<MomentRecord>({
      collection: "moments",
    });

    store.setUserId("user-1");
    await flushAsync();
    await store.remove(1, "user-1/photo.jpg");

    expect(mocks.repository.remove).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        id: 1,
        image_path: "user-1/photo.jpg",
      }),
    );
    expect(mocks.flushOutbox).toHaveBeenCalled();
    expect(store.getSnapshot().items).toEqual([]);
  });
});
