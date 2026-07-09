import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUserProfile: vi.fn(),
  writeLocalPreferences: vi.fn(),
}));

vi.mock("../../lib/profile/profileService", () => ({
  getCurrentUserProfile: mocks.getCurrentUserProfile,
}));

vi.mock("../../lib/profile/preferences", () => ({
  writeLocalPreferences: mocks.writeLocalPreferences,
}));

const { syncCurrentUserPreferences } = await import(
  "./userPreferencesSyncService"
);

describe("syncCurrentUserPreferences", () => {
  beforeEach(() => {
    mocks.getCurrentUserProfile.mockReset();
    mocks.writeLocalPreferences.mockReset();
  });

  it("writes cloud preferences locally and applies the preferred language", async () => {
    const applyLanguage = vi.fn();
    const preferences = {
      preferred_language: "en",
      ui_theme: "calm",
      accent_color: "sage",
      color_scheme: "system",
      completed_goal_retention: "next_day",
      week_starts_on: "auto",
    };
    mocks.getCurrentUserProfile.mockResolvedValue({
      username: "Mira",
      username_updated_at: null,
      updated_at: null,
      preferences_updated_at: null,
      preferences,
    });

    await expect(syncCurrentUserPreferences(applyLanguage)).resolves.toEqual(
      expect.objectContaining({ username: "Mira" }),
    );
    expect(mocks.writeLocalPreferences).toHaveBeenCalledWith(preferences);
    expect(applyLanguage).toHaveBeenCalledWith("en");
  });

  it("does nothing when there is no current user profile", async () => {
    const applyLanguage = vi.fn();
    mocks.getCurrentUserProfile.mockResolvedValue(null);

    await expect(syncCurrentUserPreferences(applyLanguage)).resolves.toBeNull();
    expect(mocks.writeLocalPreferences).not.toHaveBeenCalled();
    expect(applyLanguage).not.toHaveBeenCalled();
  });
});
