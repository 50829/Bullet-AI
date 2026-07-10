import { describe, expect, it } from "vitest";

import {
  calculateDailyStreak,
  calculateWeeklyStreak,
  projectHabit,
  startOfWeekKey,
} from "./habitProjection";
import type { HabitCheckin, HabitRecord } from "./types";

function habit(overrides: Partial<HabitRecord> = {}): HabitRecord {
  return {
    clientId: "habit-1",
    userId: "user-1",
    version: 1,
    name: "Read",
    description: null,
    frequency: "daily",
    color: null,
    startedOn: "2026-07-01",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function checkin(
  checkedOn: string,
  overrides: Partial<HabitCheckin> = {},
): HabitCheckin {
  return {
    clientId: `checkin-${checkedOn}`,
    userId: "user-1",
    version: 1,
    habitClientId: "habit-1",
    checkedOn,
    createdAt: `${checkedOn}T00:00:00.000Z`,
    updatedAt: `${checkedOn}T00:00:00.000Z`,
    ...overrides,
  };
}

describe("habit streaks", () => {
  it("counts daily streaks backwards until the first missing date", () => {
    expect(
      calculateDailyStreak(
        [checkin("2026-07-10"), checkin("2026-07-09"), checkin("2026-07-07")],
        "2026-07-10",
      ),
    ).toBe(2);
  });

  it("keeps yesterday's streak active until today ends", () => {
    expect(
      calculateDailyStreak(
        [checkin("2026-07-09"), checkin("2026-07-08")],
        "2026-07-10",
      ),
    ).toBe(2);
  });

  it("counts each completed week once", () => {
    const checkins = [
      checkin("2026-07-10"),
      checkin("2026-07-09"),
      checkin("2026-07-01"),
      checkin("2026-06-24"),
    ];
    expect(calculateWeeklyStreak(checkins, "2026-07-10", 1)).toBe(3);
    expect(startOfWeekKey("2026-07-10", 1)).toBe("2026-07-06");
  });

  it("keeps the previous weekly streak active during an unfinished week", () => {
    expect(
      calculateWeeklyStreak(
        [checkin("2026-07-01"), checkin("2026-06-24")],
        "2026-07-10",
        1,
      ),
    ).toBe(2);
  });
});

describe("projectHabit", () => {
  it("projects daily check-ins into display state", () => {
    const view = projectHabit(
      habit(),
      [
        checkin("2026-07-09"),
        checkin("2026-07-10"),
        checkin("2026-07-10", {
          clientId: "other-habit-checkin",
          habitClientId: "habit-2",
        }),
      ],
      "2026-07-10",
    );

    expect(view.isCurrentPeriodComplete).toBe(true);
    expect(view.currentPeriodCheckinId).toBe("checkin-2026-07-10");
    expect(view.checkinCount).toBe(2);
    expect(view.lastCheckedOn).toBe("2026-07-10");
    expect(view.streak).toBe(2);
    expect(view.streakUnit).toBe("day");
  });

  it("deduplicates multiple dates in one week", () => {
    const view = projectHabit(
      habit({ frequency: "weekly" }),
      [
        checkin("2026-07-10"),
        checkin("2026-07-09"),
        checkin("2026-07-01"),
        checkin("2026-06-24"),
      ],
      "2026-07-10",
      1,
    );

    expect(view.isCurrentPeriodComplete).toBe(true);
    expect(view.checkinCount).toBe(3);
    expect(view.streak).toBe(3);
    expect(view.streakUnit).toBe("week");
    expect(view.checkins.map((item) => item.checkedOn)).toEqual([
      "2026-07-10",
      "2026-07-01",
      "2026-06-24",
    ]);
  });
});
