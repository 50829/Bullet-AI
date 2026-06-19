import { describe, expect, it } from "vitest";
import {
  DEFAULT_USER_PREFERENCES,
  normalizeAccentColor,
  normalizeColorScheme,
  normalizeCompletedGoalRetention,
  normalizeLanguage,
  normalizePreferences,
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
    });
  });
});
