import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sessionUser: { id: "user-1" } as { id: string } | null,
  repository: {
    list: vi.fn(),
    replaceRemote: vi.fn(),
    mutate: vi.fn(),
  },
  readRemoteCollection: vi.fn(),
  flushOutbox: vi.fn(),
}));

vi.mock("../supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: {
          session: mocks.sessionUser ? { user: mocks.sessionUser } : null,
        },
        error: null,
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => {
        throw new Error("profileService should not query Supabase directly");
      }),
      upsert: vi.fn(() => {
        throw new Error("profileService should not upsert Supabase directly");
      }),
    })),
  },
}));

vi.mock("../localDb/collectionRepository", () => ({
  getCollectionRepository: vi.fn(() => mocks.repository),
}));

vi.mock("../localDb/remoteReader", () => ({
  readRemoteCollection: mocks.readRemoteCollection,
}));

vi.mock("../localDb/syncEngine", () => ({
  flushOutbox: mocks.flushOutbox,
}));

const { getCurrentUserProfile, updateUserDisplayName, updateUserPreferences } =
  await import("./profileService");

function profileRow(overrides: Record<string, unknown> = {}) {
  return {
    user_id: "user-1",
    username: "Mira",
    username_updated_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    preferences_updated_at: "2026-01-01T00:00:00.000Z",
    preferred_language: "zh",
    ui_theme: "calm",
    accent_color: "sage",
    color_scheme: "system",
    completed_goal_retention: "next_day",
    week_starts_on: "auto",
    ...overrides,
  };
}

describe("profileService", () => {
  beforeEach(() => {
    mocks.sessionUser = { id: "user-1" };
    mocks.repository.list.mockReset();
    mocks.repository.replaceRemote.mockReset();
    mocks.repository.mutate.mockReset();
    mocks.readRemoteCollection.mockReset();
    mocks.flushOutbox.mockReset();

    mocks.repository.list.mockResolvedValue([]);
    mocks.readRemoteCollection.mockResolvedValue([profileRow()]);
    mocks.repository.replaceRemote.mockResolvedValue([profileRow()]);
    mocks.repository.mutate.mockResolvedValue(undefined);
  });

  it("reads profiles through the localDb remote reader and cache", async () => {
    const profile = await getCurrentUserProfile();

    expect(mocks.readRemoteCollection).toHaveBeenCalledWith(
      "user-1",
      "profiles",
    );
    expect(mocks.repository.replaceRemote).toHaveBeenCalledWith("user-1", [
      expect.objectContaining({ user_id: "user-1" }),
    ]);
    expect(profile).toEqual(
      expect.objectContaining({
        username: "Mira",
        preferences: expect.objectContaining({ preferred_language: "zh" }),
      }),
    );
  });

  it("writes preferences through the profiles repository and outbox without rereading", async () => {
    const profile = await updateUserPreferences(
      "user-1",
      {
        username: "Mira",
        username_updated_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        preferences_updated_at: "2026-01-01T00:00:00.000Z",
        preferences: {
          preferred_language: "zh",
          ui_theme: "calm",
          accent_color: "sage",
          color_scheme: "system",
          completed_goal_retention: "next_day",
          week_starts_on: "auto",
        },
      },
      { preferred_language: "en" },
    );

    expect(mocks.repository.list).not.toHaveBeenCalled();
    expect(mocks.readRemoteCollection).not.toHaveBeenCalled();
    expect(mocks.repository.mutate).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        user_id: "user-1",
        username: "Mira",
        preferred_language: "en",
      }),
      "upsert",
    );
    expect(mocks.flushOutbox).toHaveBeenCalled();
    expect(profile.preferences.preferred_language).toBe("en");
  });

  it("writes display names through the profiles repository and outbox without rereading", async () => {
    const profile = await updateUserDisplayName(
      "user-1",
      {
        username: "Mira",
        username_updated_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        preferences_updated_at: "2026-01-01T00:00:00.000Z",
        preferences: {
          preferred_language: "zh",
          ui_theme: "calm",
          accent_color: "sage",
          color_scheme: "system",
          completed_goal_retention: "next_day",
          week_starts_on: "auto",
        },
      },
      "New Mira",
    );

    expect(mocks.repository.list).not.toHaveBeenCalled();
    expect(mocks.readRemoteCollection).not.toHaveBeenCalled();
    expect(mocks.repository.mutate).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        user_id: "user-1",
        username: "New Mira",
      }),
      "upsert",
    );
    expect(mocks.flushOutbox).toHaveBeenCalled();
    expect(profile.username).toBe("New Mira");
  });
});
