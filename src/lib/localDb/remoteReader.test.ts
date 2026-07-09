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
        order: vi.fn(async (column: string, options: unknown) => {
          mocks.order(column, options);
          return {
          data: mocks.remoteRows,
          error: mocks.queryError,
          };
        }),
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

const { readRemoteCollection } = await import("./remoteReader");

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
