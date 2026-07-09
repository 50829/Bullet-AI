import { beforeEach, describe, expect, it, vi } from "vitest";

type TestRecord = {
  id: number;
  client_id?: string;
  user_id?: string;
  content: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  image_url?: string | null;
  image_path?: string | null;
};

const mocks = vi.hoisted(() => ({
  remoteRows: [] as TestRecord[],
  queryError: null as { message: string } | null,
  createSignedUrl: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  is: vi.fn(),
  order: vi.fn(),
  range: vi.fn(),
}));

vi.mock("../supabaseClient", () => ({
  supabase: {
    from: vi.fn(() => {
      const builder = {
        select: vi.fn((columns: string) => {
          mocks.select(columns);
          return builder;
        }),
        eq: vi.fn((column: string, value: unknown) => {
          mocks.eq(column, value);
          return builder;
        }),
        is: vi.fn((column: string, value: unknown) => {
          mocks.is(column, value);
          return builder;
        }),
        order: vi.fn((column: string, options: unknown) => {
          mocks.order(column, options);
          return builder;
        }),
        range: vi.fn((from: number, to: number) => {
          mocks.range(from, to);
          return builder;
        }),
        then: (resolve: (value: unknown) => unknown, reject: () => unknown) => {
          return Promise.resolve({
            data: mocks.remoteRows,
            error: mocks.queryError,
          }).then(resolve, reject);
        },
      };
      return builder;
    }),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: mocks.createSignedUrl,
      })),
    },
  },
}));

const { readRemoteCollection, readRemoteCollectionPage } =
  await import("./remoteReader");

function moment(overrides: Partial<TestRecord>): TestRecord {
  return {
    id: 1,
    client_id: "moment-1",
    user_id: "user-1",
    content: "remote",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    image_url: null,
    image_path: null,
    ...overrides,
  };
}

describe("readRemoteCollection", () => {
  beforeEach(() => {
    mocks.remoteRows = [];
    mocks.queryError = null;
    mocks.createSignedUrl.mockReset();
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://signed.example/image.jpg" },
      error: null,
    });
    mocks.select.mockReset();
    mocks.eq.mockReset();
    mocks.is.mockReset();
    mocks.order.mockReset();
    mocks.range.mockReset();
  });

  it("filters deleted rows and attaches signed image URLs", async () => {
    mocks.remoteRows = [
      moment({ id: 1, image_path: "user-1/photo.jpg" }),
      moment({
        id: 2,
        client_id: "moment-2",
        content: "deleted",
        deleted_at: "2026-01-02T00:00:00.000Z",
      }),
    ];

    const rows = await readRemoteCollection<TestRecord>("user-1", "moments", {
      column: "created_at",
      ascending: false,
    });

    expect(rows).toEqual([
      expect.objectContaining({
        id: 1,
        image_url: "https://signed.example/image.jpg",
      }),
    ]);
    expect(mocks.createSignedUrl).toHaveBeenCalledWith(
      "user-1/photo.jpg",
      60 * 60,
    );
    expect(mocks.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("reads profiles without applying soft-delete filters", async () => {
    mocks.remoteRows = [
      {
        id: 0,
        user_id: "user-1",
        content: "",
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ];

    const rows = await readRemoteCollection("user-1", "profiles");

    expect(rows).toHaveLength(1);
    expect(mocks.select).toHaveBeenCalledWith(
      "user_id,username,username_updated_at,updated_at,preferences_updated_at,preferred_language,ui_theme,accent_color,color_scheme,completed_goal_retention,week_starts_on",
    );
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(mocks.is).not.toHaveBeenCalled();
    expect(mocks.order).toHaveBeenCalledWith("updated_at", {
      ascending: false,
    });
    expect(mocks.range).not.toHaveBeenCalled();
  });

  it("reads a paginated range without changing the default collection API", async () => {
    mocks.remoteRows = [
      moment({ id: 5, client_id: "moment-5" }),
      moment({ id: 4, client_id: "moment-4" }),
    ];

    const rows = await readRemoteCollection<TestRecord>(
      "user-1",
      "moments",
      { column: "created_at", ascending: false },
      { limit: 2, offset: 4 },
    );

    expect(rows).toHaveLength(2);
    expect(mocks.range).toHaveBeenCalledWith(4, 5);
  });

  it("returns page metadata and signs only the loaded page items", async () => {
    mocks.remoteRows = [
      moment({ id: 3, client_id: "moment-3", image_path: "user-1/3.jpg" }),
      moment({ id: 2, client_id: "moment-2", image_path: "user-1/2.jpg" }),
      moment({ id: 1, client_id: "moment-1", image_path: "user-1/1.jpg" }),
    ];

    const page = await readRemoteCollectionPage<TestRecord>(
      "user-1",
      "moments",
      { limit: 2, offset: 0 },
      { column: "created_at", ascending: false },
    );

    expect(page).toMatchObject({
      hasMore: true,
      nextOffset: 2,
      items: [{ id: 3 }, { id: 2 }],
    });
    expect(mocks.range).toHaveBeenCalledWith(0, 2);
    expect(mocks.createSignedUrl).toHaveBeenCalledTimes(2);
    expect(mocks.createSignedUrl).toHaveBeenNthCalledWith(
      1,
      "user-1/3.jpg",
      60 * 60,
    );
    expect(mocks.createSignedUrl).toHaveBeenNthCalledWith(
      2,
      "user-1/2.jpg",
      60 * 60,
    );
  });

  it("does not attach signed URLs for collections without storage buckets", async () => {
    mocks.remoteRows = [
      moment({
        image_path: "user-1/legacy-habit-photo.jpg",
      }),
    ];

    const rows = await readRemoteCollection<TestRecord>("user-1", "habits");

    expect(rows[0]).toMatchObject({ image_url: null });
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it("throws when the remote query fails", async () => {
    mocks.queryError = { message: "remote unavailable" };

    await expect(
      readRemoteCollection<TestRecord>("user-1", "moments", {
        column: "created_at",
        ascending: false,
      }),
    ).rejects.toThrow("remote unavailable");
  });
});
