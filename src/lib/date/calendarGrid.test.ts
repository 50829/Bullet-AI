import { describe, expect, it } from "vitest";

import { buildCalendarGrid } from "./calendarGrid";

describe("buildCalendarGrid", () => {
  it("keeps the sixth week visible for May 2026", () => {
    const days = buildCalendarGrid(2026, 4);

    expect(days).toHaveLength(42);
    expect(days[0].dateKey).toBe("2026-04-26");
    expect(days[35]).toMatchObject({
      dateKey: "2026-05-31",
      isCurrentMonth: true,
    });
    expect(days[41].dateKey).toBe("2026-06-06");
  });

  it("supports Monday as the first day of the week", () => {
    const days = buildCalendarGrid(2026, 6, 1);

    expect(days).toHaveLength(42);
    expect(days[0].dateKey).toBe("2026-06-29");
    expect(days[3]).toMatchObject({
      dateKey: "2026-07-02",
      isCurrentMonth: true,
    });
    expect(days[41].dateKey).toBe("2026-08-09");
  });

  it("supports Saturday as the first day of the week", () => {
    const days = buildCalendarGrid(2026, 6, 6);

    expect(days).toHaveLength(42);
    expect(days[0].dateKey).toBe("2026-06-27");
    expect(days[4]).toMatchObject({
      dateKey: "2026-07-01",
      isCurrentMonth: true,
    });
    expect(days[41].dateKey).toBe("2026-08-07");
  });
});
