import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MomentRecord } from "../../moments/types";
import type { ReflectionRecord } from "../../reflections/types";

const mocks = vi.hoisted(() => ({
  readRemoteCollectionPage: vi.fn(),
}));

vi.mock("../../../lib/localDb/remoteReader", () => ({
  readRemoteCollectionPage: mocks.readRemoteCollectionPage,
}));

const { buildRecentDashboardItems, loadRecentDashboardItems } =
  await import("./useRecentDashboardRecords");

function moment(overrides: Partial<MomentRecord>): MomentRecord {
  return {
    id: 1,
    client_id: "moment-1",
    user_id: "user-1",
    content: "Moment",
    created_at: "2026-07-08T08:00:00.000Z",
    updated_at: "2026-07-08T08:00:00.000Z",
    image_url: null,
    image_path: null,
    ...overrides,
  };
}

function reflection(overrides: Partial<ReflectionRecord>): ReflectionRecord {
  return {
    id: 1,
    client_id: "reflection-1",
    user_id: "user-1",
    content: "Reflection body",
    title: null,
    body: null,
    source: null,
    source_type: null,
    location: null,
    created_at: "2026-07-07T08:00:00.000Z",
    updated_at: "2026-07-07T08:00:00.000Z",
    image_url: null,
    image_path: null,
    ...overrides,
  };
}

describe("dashboard recent records", () => {
  beforeEach(() => {
    mocks.readRemoteCollectionPage.mockReset();
  });

  it("loads only the limited recent moment and reflection pages", async () => {
    mocks.readRemoteCollectionPage
      .mockResolvedValueOnce({
        items: [moment({ id: 1 })],
        hasMore: true,
        nextOffset: 4,
      })
      .mockResolvedValueOnce({
        items: [reflection({ id: 2 })],
        hasMore: false,
        nextOffset: 1,
      });

    await loadRecentDashboardItems("user-1", "zh", "记录");

    expect(mocks.readRemoteCollectionPage).toHaveBeenNthCalledWith(
      1,
      "user-1",
      "moments",
      { limit: 4, offset: 0, includeSignedImageUrls: false },
      { column: "created_at", ascending: false },
    );
    expect(mocks.readRemoteCollectionPage).toHaveBeenNthCalledWith(
      2,
      "user-1",
      "reflections",
      { limit: 3, offset: 0, includeSignedImageUrls: false },
      { column: "updated_at", ascending: false },
    );
  });

  it("sorts the limited page results and returns the five most recent cards", () => {
    const items = buildRecentDashboardItems(
      [
        moment({
          id: 1,
          content: "old moment",
          created_at: "2026-07-01T08:00:00.000Z",
        }),
        moment({
          id: 2,
          content: "new moment",
          created_at: "2026-07-09T08:00:00.000Z",
        }),
        moment({
          id: 3,
          content: "mid moment",
          created_at: "2026-07-05T08:00:00.000Z",
        }),
        moment({
          id: 4,
          content: "page moment",
          created_at: "2026-07-04T08:00:00.000Z",
        }),
      ],
      [
        reflection({
          id: 5,
          content: "new reflection",
          title: "New reflection",
          updated_at: "2026-07-08T08:00:00.000Z",
        }),
        reflection({
          id: 6,
          content: "old reflection",
          title: "Old reflection",
          updated_at: "2026-07-02T08:00:00.000Z",
        }),
      ],
      "en",
      "Moment",
    );

    expect(items.map((item) => item.id)).toEqual([
      "moment-2",
      "reflection-5",
      "moment-3",
      "moment-4",
      "reflection-6",
    ]);
  });
});
