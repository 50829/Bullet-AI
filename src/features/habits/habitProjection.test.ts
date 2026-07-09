import { describe, expect, it } from "vitest";

import { calculateDailyStreak, projectHabit } from "./habitProjection";
import type { HabitCheckin, HabitRecord } from "./types";

function habit(overrides: Partial<HabitRecord> = {}): HabitRecord {
  return {
    id: 1,
    client_id: "habit-1",
    name: "Read",
    description: null,
    frequency: "daily",
    color: null,
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
    deleted_at: null,
    ...overrides,
  };
}

function checkin(
  checked_on: string,
  overrides: Partial<HabitCheckin> = {},
): HabitCheckin {
  return {
    id: Number(checked_on.replaceAll("-", "")),
    client_id: `checkin-${checked_on}`,
    user_id: "user-1",
    habit_id: null,
    habit_client_id: "habit-1",
    checked_on,
    checked: true,
    created_at: `${checked_on}T00:00:00.000Z`,
    updated_at: `${checked_on}T00:00:00.000Z`,
    deleted_at: null,
    ...overrides,
  };
}

describe("calculateDailyStreak", () => {
  it("counts backwards from today until the first missing checked date", () => {
    expect(
      calculateDailyStreak(
        [checkin("2026-07-10"), checkin("2026-07-09"), checkin("2026-07-07")],
        "2026-07-10",
      ),
    ).toBe(2);
  });

  it("returns zero when today is not checked", () => {
    expect(calculateDailyStreak([checkin("2026-07-09")], "2026-07-10")).toBe(0);
  });
});

describe("projectHabit", () => {
  it("projects valid checkins into display state", () => {
    const view = projectHabit(
      habit(),
      [
        checkin("2026-07-09"),
        checkin("2026-07-10"),
        checkin("2026-07-08", { checked: false }),
        checkin("2026-07-10", {
          id: 2026071002,
          client_id: "deleted-checkin",
          deleted_at: "2026-07-10T01:00:00.000Z",
        }),
        checkin("2026-07-10", {
          id: 2026071003,
          client_id: "other-habit-checkin",
          habit_client_id: "habit-2",
        }),
      ],
      "2026-07-10",
    );

    expect(view.checkedToday).toBe(true);
    expect(view.todayCheckinId).toBe(20260710);
    expect(view.checkinCount).toBe(2);
    expect(view.lastCheckedOn).toBe("2026-07-10");
    expect(view.streak).toBe(2);
    expect(view.checkins.map((item) => item.checked_on)).toEqual([
      "2026-07-10",
      "2026-07-09",
    ]);
  });

  it("does not calculate a daily streak for weekly habits", () => {
    const view = projectHabit(
      habit({ frequency: "weekly" }),
      [checkin("2026-07-10"), checkin("2026-07-09")],
      "2026-07-10",
    );

    expect(view.streak).toBe(0);
  });
});
