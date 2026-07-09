import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LocalFirstEntity } from "./types";

type TestRecord = LocalFirstEntity & {
  content: string;
};

const mocks = vi.hoisted(() => ({
  remoteRows: [] as TestRecord[],
  remotePage: {
    items: [] as TestRecord[],
    hasMore: false,
    nextOffset: 0,
  },
  repository: {
    list: vi.fn(),
    cacheRemote: vi.fn(),
    mutate: vi.fn(),
    remove: vi.fn(),
    replaceRemote: vi.fn(),
    subscribe: vi.fn(() => () => undefined),
  },
  flushOutbox: vi.fn(),
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../localDb/collectionRepository", () => ({
  getCollectionRepository: vi.fn(() => mocks.repository),
}));

vi.mock("../localDb/syncEngine", () => ({
  flushOutbox: mocks.flushOutbox,
}));

vi.mock("../observability/logger", () => ({
  logger: mocks.logger,
}));

vi.mock("../localDb/remoteReader", () => ({
  readRemoteCollection: vi.fn(async () => mocks.remoteRows),
  readRemoteCollectionPage: vi.fn(async () => mocks.remotePage),
}));

const { LocalFirstCollectionStore } =
  await import("./localFirstCollectionStore");
const { readRemoteCollectionPage } = await import("../localDb/remoteReader");

function moment(overrides: Partial<TestRecord>): TestRecord {
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

describe("LocalFirstCollectionStore", () => {
  beforeEach(() => {
    mocks.remoteRows = [];
    mocks.remotePage = { items: [], hasMore: false, nextOffset: 0 };
    mocks.repository.list.mockReset();
    mocks.repository.cacheRemote.mockReset();
    mocks.repository.mutate.mockReset();
    mocks.repository.remove.mockReset();
    mocks.repository.replaceRemote.mockReset();
    mocks.repository.subscribe.mockReset();
    mocks.repository.subscribe.mockReturnValue(() => undefined);
    mocks.flushOutbox.mockReset();
    mocks.logger.error.mockReset();
    mocks.logger.info.mockReset();
    mocks.logger.warn.mockReset();
    vi.mocked(readRemoteCollectionPage).mockClear();
  });

  it("shows cached rows before replacing them with the remote snapshot", async () => {
    const cached = moment({ id: 1, content: "cached" });
    const remote = moment({ id: 2, client_id: "moment-2", content: "remote" });
    mocks.repository.list.mockResolvedValue([cached]);
    mocks.remoteRows = [remote];
    mocks.repository.replaceRemote.mockResolvedValue([remote]);
    const store = LocalFirstCollectionStore.create<TestRecord>({
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
    const store = LocalFirstCollectionStore.create<TestRecord>({
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
    const store = LocalFirstCollectionStore.create<TestRecord>({
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

  it("caches paged remote rows without pruning older local rows", async () => {
    const first = moment({ id: 3, client_id: "moment-3", content: "first" });
    const second = moment({ id: 2, client_id: "moment-2", content: "second" });
    const third = moment({ id: 1, client_id: "moment-1", content: "third" });
    mocks.repository.list
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([first, second])
      .mockResolvedValueOnce([first, second, third]);
    mocks.remotePage = {
      items: [first, second],
      hasMore: true,
      nextOffset: 2,
    };
    mocks.repository.cacheRemote.mockResolvedValue([first, second]);
    const store = LocalFirstCollectionStore.create<TestRecord>({
      collection: "moments",
      initialRemotePageSize: 2,
    });

    store.setUserId("user-1");
    await flushAsync();

    expect(readRemoteCollectionPage).toHaveBeenCalledWith(
      "user-1",
      "moments",
      { limit: 2, offset: 0 },
      { column: "created_at", ascending: false },
    );
    expect(mocks.repository.cacheRemote).toHaveBeenCalledWith("user-1", [
      first,
      second,
    ]);
    expect(mocks.repository.replaceRemote).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toMatchObject({
      items: [
        expect.objectContaining({ content: "first" }),
        expect.objectContaining({ content: "second" }),
      ],
      hasMore: true,
    });

    mocks.remotePage = {
      items: [third],
      hasMore: false,
      nextOffset: 3,
    };
    mocks.repository.cacheRemote.mockResolvedValue([first, second, third]);

    await store.loadMore();

    expect(readRemoteCollectionPage).toHaveBeenLastCalledWith(
      "user-1",
      "moments",
      { limit: 2, offset: 2 },
      { column: "created_at", ascending: false },
    );
    expect(store.getSnapshot()).toMatchObject({
      items: [
        expect.objectContaining({ content: "first" }),
        expect.objectContaining({ content: "second" }),
        expect.objectContaining({ content: "third" }),
      ],
      hasMore: false,
      loadingMore: false,
    });
  });

  it("does not let local-only rows consume remote page capacity", async () => {
    const pending = moment({
      id: 99,
      client_id: "moment-pending",
      content: "pending",
      created_at: "2026-01-04T00:00:00.000Z",
      _local: { pending: true },
    });
    const first = moment({
      id: 2,
      client_id: "moment-2",
      content: "first",
      created_at: "2026-01-03T00:00:00.000Z",
    });
    const second = moment({
      id: 1,
      client_id: "moment-1",
      content: "second",
      created_at: "2026-01-02T00:00:00.000Z",
    });
    mocks.repository.list.mockResolvedValue([pending]);
    mocks.remotePage = {
      items: [first, second],
      hasMore: true,
      nextOffset: 2,
    };
    mocks.repository.cacheRemote.mockResolvedValue([pending, first, second]);
    const store = LocalFirstCollectionStore.create<TestRecord>({
      collection: "moments",
      initialRemotePageSize: 2,
    });

    store.setUserId("user-1");
    await flushAsync();

    expect(store.getSnapshot()).toMatchObject({
      items: [
        expect.objectContaining({ content: "pending" }),
        expect.objectContaining({ content: "first" }),
        expect.objectContaining({ content: "second" }),
      ],
      hasMore: true,
    });
  });

  it("does not let unrelated synced cache rows consume remote page capacity", async () => {
    const staleSynced = moment({
      id: 99,
      client_id: "moment-stale",
      content: "stale synced cache",
      created_at: "2026-01-05T00:00:00.000Z",
    });
    const first = moment({
      id: 2,
      client_id: "moment-2",
      content: "first remote",
      created_at: "2026-01-03T00:00:00.000Z",
    });
    const second = moment({
      id: 1,
      client_id: "moment-1",
      content: "second remote",
      created_at: "2026-01-02T00:00:00.000Z",
    });
    mocks.repository.list.mockResolvedValue([staleSynced]);
    mocks.remotePage = {
      items: [first, second],
      hasMore: false,
      nextOffset: 2,
    };
    mocks.repository.cacheRemote.mockResolvedValue([
      staleSynced,
      first,
      second,
    ]);
    const store = LocalFirstCollectionStore.create<TestRecord>({
      collection: "moments",
      initialRemotePageSize: 2,
    });

    store.setUserId("user-1");
    await flushAsync();

    expect(store.getSnapshot().items.map((item) => item.content)).toEqual([
      "first remote",
      "second remote",
    ]);
  });
});
