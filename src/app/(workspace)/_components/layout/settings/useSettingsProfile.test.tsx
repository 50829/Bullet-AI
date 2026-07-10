// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_USER_PREFERENCES } from "@/lib/profile/preferences";

const mocks = vi.hoisted(() => {
  const profilePreferences = {
    preferred_language: "zh",
    ui_theme: "calm",
    accent_color: "sage",
    color_scheme: "system",
    completed_goal_retention: "next_day",
    week_starts_on: "auto",
  };
  const updateLocalPreferences = vi.fn();
  const replacePreferences = vi.fn();
  const updateUsername = vi.fn();
  const updateCloudPreferences = vi.fn();
  const retrySync = vi.fn();
  const retrySyncItem = vi.fn();
  const discardSyncItem = vi.fn();
  const resolveSyncConflict = vi.fn();
  const store = { id: "store" };
  const worker = { id: "worker" };
  return {
    profilePreferences,
    updateLocalPreferences,
    replacePreferences,
    updateUsername,
    updateCloudPreferences,
    showToast: vi.fn(),
    retrySync,
    retrySyncItem,
    discardSyncItem,
    resolveSyncConflict,
    replaceRoute: vi.fn(),
    signOut: vi.fn(),
    store,
    worker,
    preferencesContext: {
      updatePreferences: updateLocalPreferences,
      replacePreferences,
    },
    profileContext: {
      profile: { username: "Mira", preferences: profilePreferences },
      loading: false,
      updateUsername,
      updatePreferences: updateCloudPreferences,
    },
    workspaceContext: {
      userId: "user-1",
      syncStatus: "failed",
      pendingCount: 1,
      syncIssues: [],
      retrySync,
      retrySyncItem,
      discardSyncItem,
      resolveSyncConflict,
    },
    runtime: { store, worker },
  };
});

vi.mock("@/shared/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (key: string) => key }),
}));
vi.mock("@/shared/components/ui/Toast", () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}));
vi.mock("@/lib/profile/PreferencesContext", () => ({
  usePreferences: () => mocks.preferencesContext,
}));
vi.mock("@/features/profile/ProfileContext", () => ({
  useProfile: () => mocks.profileContext,
}));
vi.mock("@/features/workspace/WorkspaceContext", () => ({
  useWorkspaceSessionContext: () => mocks.workspaceContext,
}));
vi.mock("@/data", () => ({
  useDataRuntime: () => mocks.runtime,
}));
vi.mock("@/features/workspace/logout", () => ({
  signOutAndClearLocalData: mocks.signOut,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replaceRoute }),
}));

import { useSettingsProfile } from "./useSettingsProfile";

afterEach(cleanup);

describe("useSettingsProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateCloudPreferences.mockImplementation(async (updates) => ({
      ...DEFAULT_USER_PREFERENCES,
      ...updates,
    }));
    mocks.signOut.mockResolvedValue({ error: null, discardedPendingCount: 0 });
  });

  it("hydrates settings from profile and persists a language change locally and remotely", async () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useSettingsProfile({ onClose }));
    await waitFor(() => expect(result.current.username).toBe("Mira"));

    act(() => result.current.handleLanguageChange("en"));
    await waitFor(() =>
      expect(mocks.updateCloudPreferences).toHaveBeenCalledWith({
        preferred_language: "en",
      }),
    );
    expect(mocks.updateLocalPreferences).toHaveBeenCalledWith(
      expect.objectContaining({ preferred_language: "en" }),
    );
    expect(mocks.replacePreferences).toHaveBeenCalledWith(
      expect.objectContaining({ preferred_language: "en" }),
    );
    await waitFor(() => expect(result.current.savingPreference).toBeNull());
  });

  it("delegates logout cleanup with the active data runtime before redirecting", async () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useSettingsProfile({ onClose }));
    await waitFor(() => expect(result.current.username).toBe("Mira"));

    await act(() => result.current.handleLogout());
    expect(mocks.signOut).toHaveBeenCalledWith({
      userId: "user-1",
      store: mocks.store,
      worker: mocks.worker,
    });
    expect(onClose).toHaveBeenCalledOnce();
    expect(mocks.replaceRoute).toHaveBeenCalledWith("/");
  });
});
