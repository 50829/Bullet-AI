import { describe, expect, it } from "vitest";
import type { MomentRecord } from "../../moments/types";
import type { ReflectionRecord } from "../../reflections/types";
import { buildRecentDashboardItems } from "./useRecentDashboardRecords";

function moment(overrides: Partial<MomentRecord>): MomentRecord {
  return {
    clientId: "moment-1",
    userId: "user-1",
    version: 1,
    content: "Moment",
    occurredOn: "2026-07-08",
    createdAt: "2026-07-08T08:00:00.000Z",
    updatedAt: "2026-07-08T08:00:00.000Z",
    imageUrl: null,
    imagePath: null,
    ...overrides,
  };
}

function reflection(overrides: Partial<ReflectionRecord>): ReflectionRecord {
  return {
    clientId: "reflection-1",
    userId: "user-1",
    version: 1,
    title: "Reflection",
    body: "Reflection body",
    createdAt: "2026-07-07T08:00:00.000Z",
    updatedAt: "2026-07-07T08:00:00.000Z",
    ...overrides,
  };
}

describe("dashboard recent records", () => {
  it("sorts v2 snapshots and returns the five most recently updated records", () => {
    const items = buildRecentDashboardItems(
      [
        moment({
          clientId: "moment-1",
          content: "old moment",
          updatedAt: "2026-07-01T08:00:00.000Z",
        }),
        moment({
          clientId: "moment-2",
          content: "new moment",
          updatedAt: "2026-07-09T08:00:00.000Z",
        }),
        moment({
          clientId: "moment-3",
          content: "mid moment",
          updatedAt: "2026-07-05T08:00:00.000Z",
        }),
        moment({
          clientId: "moment-4",
          content: "page moment",
          updatedAt: "2026-07-04T08:00:00.000Z",
        }),
      ],
      [
        reflection({
          clientId: "reflection-5",
          title: "New reflection",
          updatedAt: "2026-07-08T08:00:00.000Z",
        }),
        reflection({
          clientId: "reflection-6",
          title: "Old reflection",
          updatedAt: "2026-07-02T08:00:00.000Z",
        }),
      ],
      "en",
      "Moment",
    );

    expect(items.map((item) => item.id)).toEqual([
      "moment:moment-2",
      "reflection:reflection-5",
      "moment:moment-3",
      "moment:moment-4",
      "reflection:reflection-6",
    ]);
  });

  it("uses occurrence date for moment labels", () => {
    const [item] = buildRecentDashboardItems(
      [moment({ occurredOn: "2026-07-03" })],
      [],
      "en",
      "Moment",
    );

    expect(item.dateLabel).toMatch(/^07-03 /);
  });
});
