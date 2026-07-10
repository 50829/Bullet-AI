// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AnyConflictDetails } from "@/data";
import { DEFAULT_USER_PREFERENCES } from "@/lib/profile/preferences";
import type { SyncIssue } from "@/features/workspace/types";
import { DataSettingsSection } from "./DataSettingsSection";

vi.mock("@/shared/i18n/LanguageContext", () => ({
  useLanguage: () => ({
    language: "en",
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

afterEach(cleanup);

const baseIssue: SyncIssue = {
  id: "mutation-1",
  resource: "moments",
  operation: "patch",
  status: "blocked",
  error: "network rejected the change",
  attemptCount: 1,
  updatedAt: "2026-07-10T08:00:00.000Z",
  conflict: null,
};

function renderSection(
  issue: SyncIssue,
  overrides: Partial<ComponentProps<typeof DataSettingsSection>> = {},
) {
  const props: ComponentProps<typeof DataSettingsSection> = {
    preferences: DEFAULT_USER_PREFERENCES,
    savingPreference: null,
    syncStatus: "failed",
    pendingCount: 1,
    syncIssues: [issue],
    onCompletedGoalRetentionChange: vi.fn(),
    onRetrySync: vi.fn(),
    onRetrySyncItem: vi.fn(),
    onDiscardSyncItem: vi.fn(),
    onResolveSyncConflict: vi.fn(),
    onExport: vi.fn(),
    ...overrides,
  };
  return { ...render(createElement(DataSettingsSection, props)), props };
}

describe("DataSettingsSection", () => {
  it("retries an individual blocked mutation and confirms discard", async () => {
    const user = userEvent.setup();
    const onRetrySyncItem = vi.fn().mockResolvedValue(undefined);
    const onDiscardSyncItem = vi.fn().mockResolvedValue(undefined);
    renderSection(baseIssue, { onRetrySyncItem, onDiscardSyncItem });

    expect(screen.getByText(/moments · patch · blocked/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() =>
      expect(onRetrySyncItem).toHaveBeenCalledWith("mutation-1"),
    );

    await user.click(screen.getByRole("button", { name: "Discard local" }));
    expect(screen.getByRole("dialog").textContent).toContain(
      "Discard local change?",
    );
    await user.click(screen.getByRole("button", { name: "Discard" }));
    await waitFor(() =>
      expect(onDiscardSyncItem).toHaveBeenCalledWith("mutation-1"),
    );
  });

  it("reviews a delete conflict and confirms finishing a remote tombstone", async () => {
    const user = userEvent.setup();
    const onResolveSyncConflict = vi.fn().mockResolvedValue(undefined);
    const local = {
      clientId: "moment-1",
      userId: "user-1",
      version: 2,
      createdAt: "2026-07-09T08:00:00.000Z",
      updatedAt: "2026-07-10T08:00:00.000Z",
      content: "local moment",
      occurredOn: "2026-07-09",
      imagePath: null,
    };
    const conflict = {
      conflictId: "conflict-1",
      mutationId: "mutation-1",
      userId: "user-1",
      resource: "moments",
      clientId: "moment-1",
      baseVersion: 2,
      kind: "delete",
      changes: null,
      local,
      remote: null,
      reason: "remote missing",
      createdAt: "2026-07-10T08:00:00.000Z",
      mutation: {
        mutationId: "mutation-1",
        userId: "user-1",
        resource: "moments",
        clientId: "moment-1",
        kind: "delete",
        optimistic: local,
        status: "conflict",
        attemptCount: 1,
        nextAttemptAt: "2026-07-10T08:00:00.000Z",
        createdAt: "2026-07-10T08:00:00.000Z",
        updatedAt: "2026-07-10T08:00:00.000Z",
        baseVersion: 2,
        changes: null,
      },
      blobs: [],
    } as AnyConflictDetails;

    renderSection(
      { ...baseIssue, operation: "delete", status: "conflict", conflict },
      { onResolveSyncConflict },
    );

    await user.click(screen.getByRole("button", { name: "Review conflict" }));
    await user.click(screen.getByRole("button", { name: "Finish deletion" }));
    expect(screen.getByRole("dialog").textContent).toContain(
      "Finish deletion?",
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() =>
      expect(onResolveSyncConflict).toHaveBeenCalledWith("mutation-1", {
        action: "keep-local",
      }),
    );
  });
});
