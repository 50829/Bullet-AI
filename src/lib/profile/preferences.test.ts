import { describe, expect, it } from "vitest";
import {
  DEFAULT_USER_PREFERENCES,
  normalizeAccentColor,
  normalizeColorScheme,
  normalizeCompletedGoalRetention,
  normalizeLanguage,
  normalizePreferences,
  normalizeWeekStartsOn,
  resolveWeekStartsOn,
} from "./preferences";

describe("preferences", () => {
  it("normalizes individual preference values", () => {
    expect(normalizeLanguage("en")).toBe("en");
    expect(normalizeLanguage("fr")).toBe("zh");
    expect(normalizeAccentColor("purple")).toBe("purple");
    expect(normalizeAccentColor("blue")).toBe("sage");
    expect(normalizeColorScheme("dark")).toBe("dark");
    expect(normalizeColorScheme("sepia")).toBe("system");
    expect(normalizeCompletedGoalRetention("never")).toBe("never");
    expect(normalizeCompletedGoalRetention("later")).toBe("next_day");
    expect(normalizeWeekStartsOn("saturday")).toBe("saturday");
    expect(normalizeWeekStartsOn("friday")).toBe("auto");
  });

  it("fills missing preferences with defaults", () => {
    expect(normalizePreferences(null)).toEqual(DEFAULT_USER_PREFERENCES);
    expect(
      normalizePreferences({
        preferred_language: "en",
        completed_goal_retention: "instant",
      }),
    ).toEqual({
      ...DEFAULT_USER_PREFERENCES,
      preferred_language: "en",
      completed_goal_retention: "instant",
      week_starts_on: "auto",
    });
  });

  it("resolves automatic week starts from language", () => {
    expect(resolveWeekStartsOn("auto", "zh")).toBe(1);
    expect(resolveWeekStartsOn("auto", "en")).toBe(0);
    expect(resolveWeekStartsOn("saturday", "zh")).toBe(6);
    expect(resolveWeekStartsOn("saturday", "en")).toBe(6);
  });
});
