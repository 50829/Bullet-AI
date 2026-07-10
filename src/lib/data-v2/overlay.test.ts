import { describe, expect, it } from "vitest";
import { applyMutationOverlay, applyPendingOverlay } from "./overlay";
import type { MutationRecord, SnapshotRecord } from "./types";

const baseMoment = {
  userId: "user-1",
  clientId: "moment-1",
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  content: "remote",
  occurredOn: "2026-01-01",
  imagePath: null,
};

function snapshot(): SnapshotRecord<"moments"> {
  return {
    key: "user-1:moments:moment-1",
    userId: "user-1",
    resource: "moments",
    clientId: "moment-1",
    entity: baseMoment,
    syncedAt: "2026-01-01T00:00:00.000Z",
    lastAccessedAt: "2026-01-01T00:00:00.000Z",
  };
}

function patchMutation(
  overrides: Partial<MutationRecord<"moments">> = {},
): MutationRecord<"moments"> {
  return {
    mutationId: "mutation-1",
    userId: "user-1",
    resource: "moments",
    clientId: "moment-1",
    kind: "patch",
    baseVersion: 1,
    changes: { content: "local" },
    optimistic: { ...baseMoment, content: "local" },
    status: "queued",
    attemptCount: 0,
    nextAttemptAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as MutationRecord<"moments">;
}

describe("applyPendingOverlay", () => {
  it("keeps the canonical snapshot untouched while showing the local draft", () => {
    const canonical = snapshot();
    const result = applyPendingOverlay([canonical], [patchMutation()]);

    expect(result[0]).toMatchObject({
      entity: { content: "local" },
      sync: { status: "queued", mutationId: "mutation-1" },
    });
    expect(canonical.entity.content).toBe("remote");
  });

  it("keeps a conflict draft visible", () => {
    const result = applyPendingOverlay(
      [snapshot()],
      [patchMutation({ status: "conflict", lastError: "version mismatch" })],
    );

    expect(result[0]).toMatchObject({
      entity: { content: "local" },
      sync: { status: "conflict", error: "version mismatch" },
    });
  });

  it("does not hide an earlier conflict behind a queued successor", () => {
    const result = applyPendingOverlay(
      [snapshot()],
      [
        patchMutation({
          mutationId: "mutation-conflict",
          status: "conflict",
          lastError: "version mismatch",
        }),
        patchMutation({
          mutationId: "mutation-successor",
          changes: { content: "latest local" },
          optimistic: { ...baseMoment, content: "latest local" },
          createdAt: "2026-01-02T00:00:00.000Z",
        }),
      ],
    );

    expect(result[0]).toMatchObject({
      entity: { content: "latest local" },
      sync: {
        status: "conflict",
        mutationId: "mutation-conflict",
        error: "version mismatch",
      },
    });
  });

  it("does not hide an earlier conflict behind a queued delete", () => {
    const conflict = patchMutation({
      mutationId: "mutation-conflict",
      status: "conflict",
      lastError: "version mismatch",
    });
    const deletion = patchMutation({
      mutationId: "mutation-delete",
      kind: "delete",
      changes: null,
      createdAt: "2026-01-02T00:00:00.000Z",
    } as Partial<MutationRecord<"moments">>);

    expect(applyMutationOverlay([baseMoment], [conflict, deletion])).toEqual([
      expect.objectContaining({
        entity: expect.objectContaining({ clientId: "moment-1" }),
        sync: expect.objectContaining({
          status: "conflict",
          mutationId: "mutation-conflict",
        }),
      }),
    ]);
  });

  it("hides an entity behind a pending hard delete", () => {
    const deletion = patchMutation({
      kind: "delete",
      changes: null,
    } as Partial<MutationRecord<"moments">>);
    expect(applyPendingOverlay([snapshot()], [deletion])).toEqual([]);
  });
});
