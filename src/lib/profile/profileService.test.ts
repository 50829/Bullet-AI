import { describe, expect, it } from "vitest";
import type { ProfileEntity } from "../../domain/entities";
import { profileEntityToUserProfile } from "./profileService";

describe("profileService projections", () => {
  it("maps the domain profile into the UI preference view", () => {
    const entity: ProfileEntity = {
      clientId: "user-1",
      userId: "user-1",
      version: 3,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-07-10T00:00:00.000Z",
      username: "Mira",
      preferredLanguage: "en",
      accentColor: "amber",
      colorScheme: "dark",
      completedGoalRetention: "never",
      weekStartsOn: "saturday",
    };

    expect(profileEntityToUserProfile(entity)).toEqual({
      username: "Mira",
      preferences: {
        preferred_language: "en",
        ui_theme: "calm",
        accent_color: "amber",
        color_scheme: "dark",
        completed_goal_retention: "never",
        week_starts_on: "saturday",
      },
    });
  });

  it("returns null when no authenticated profile exists", () => {
    expect(profileEntityToUserProfile(null)).toBeNull();
  });
});
