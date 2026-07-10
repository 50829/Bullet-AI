import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state: { result: { data: unknown; error: unknown } } = {
    result: { data: null, error: null },
  };
  type QueryMock = Record<
    "select" | "eq" | "gt" | "order" | "limit" | "in" | "maybeSingle",
    ReturnType<typeof vi.fn>
  > & {
    then: (
      resolve: (value: unknown) => unknown,
      reject: (reason: unknown) => unknown,
    ) => Promise<unknown>;
  };
  const query = {} as QueryMock;
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.gt = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.limit = vi.fn(() => query);
  query.in = vi.fn(() => query);
  query.maybeSingle = vi.fn(async () => state.result);
  query.then = (
    resolve: (value: unknown) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve(state.result).then(resolve, reject);
  return {
    state,
    query,
    from: vi.fn(() => query),
    clearQueryMocks: () => {
      query.select.mockClear();
      query.eq.mockClear();
      query.gt.mockClear();
      query.order.mockClear();
      query.limit.mockClear();
      query.in.mockClear();
      query.maybeSingle.mockClear();
    },
  };
});

vi.mock("../../../lib/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

const {
  loadRemoteChangePage,
  loadRemoteChangeWatermark,
  loadRemoteEntitiesByClientId,
} = await import("./remoteChangeReaderV2");

function momentRow(clientId: string, version = 1) {
  return {
    id: 1,
    client_id: clientId,
    user_id: "user-1",
    content: clientId,
    occurred_on: "2026-07-10",
    image_path: null,
    version,
    created_at: "2026-07-10T00:00:00.000Z",
    updated_at: "2026-07-10T00:00:00.000Z",
  };
}

describe("remote incremental change reader", () => {
  beforeEach(() => {
    mocks.state.result = { data: null, error: null };
    mocks.from.mockClear();
    mocks.clearQueryMocks();
  });

  it("reads the latest resource high-water sequence as a string cursor", async () => {
    mocks.state.result = { data: { sequence: 9007199254740991 }, error: null };

    await expect(loadRemoteChangeWatermark("user-1", "moments")).resolves.toBe(
      "9007199254740991",
    );

    expect(mocks.from).toHaveBeenCalledWith("workspace_change_log");
    expect(mocks.query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(mocks.query.eq).toHaveBeenCalledWith("resource", "moments");
    expect(mocks.query.order).toHaveBeenCalledWith("sequence", {
      ascending: false,
    });
  });

  it("returns a bounded, validated page and a stable next cursor", async () => {
    mocks.state.result = {
      data: [
        {
          sequence: 11,
          resource: "moments",
          client_id: "moment-1",
          operation: "upsert",
          version: 2,
        },
        {
          sequence: 12,
          resource: "moments",
          client_id: "moment-2",
          operation: "delete",
          version: 1,
        },
        {
          sequence: 13,
          resource: "moments",
          client_id: "look-ahead",
          operation: "upsert",
          version: 1,
        },
      ],
      error: null,
    };

    await expect(
      loadRemoteChangePage("user-1", "moments", "10", 2),
    ).resolves.toEqual({
      changes: [
        expect.objectContaining({ sequence: "11", operation: "upsert" }),
        expect.objectContaining({ sequence: "12", operation: "delete" }),
      ],
      nextCursor: "12",
      hasMore: true,
    });
    expect(mocks.query.gt).toHaveBeenCalledWith("sequence", "10");
    expect(mocks.query.limit).toHaveBeenCalledWith(3);
  });

  it("loads the current rows for changed ids through the domain mapper", async () => {
    mocks.state.result = {
      data: [momentRow("moment-1", 3)],
      error: null,
    };

    await expect(
      loadRemoteEntitiesByClientId("user-1", "moments", [
        "moment-1",
        "moment-1",
      ]),
    ).resolves.toEqual([
      expect.objectContaining({
        clientId: "moment-1",
        userId: "user-1",
        version: 3,
      }),
    ]);
    expect(mocks.from).toHaveBeenCalledWith("moments");
    expect(mocks.query.in).toHaveBeenCalledWith("client_id", ["moment-1"]);
  });

  it("rejects malformed cursors and change rows before advancing state", async () => {
    await expect(
      loadRemoteChangePage("user-1", "moments", "not-a-sequence"),
    ).rejects.toThrow("cursor");

    mocks.state.result = {
      data: [
        {
          sequence: 11,
          resource: "unknown",
          client_id: "bad",
          operation: "upsert",
          version: 1,
        },
      ],
      error: null,
    };
    await expect(
      loadRemoteChangePage("user-1", "moments", "10"),
    ).rejects.toThrow("resource");
  });
});
