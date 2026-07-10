import { describe, expect, it } from "vitest";
import type {
  AnyConflictDetails,
  MutationBlobRecord,
  MutationRecord,
} from "@/data";
import {
  chooseConflictValue,
  conflictFieldLabel,
  conflictFields,
  createMergeDraft,
  editConflictValue,
  formatConflictValue,
  validateConflictMerge,
} from "./conflictPresentation";

function momentConflict(blobs: MutationBlobRecord[] = []): AnyConflictDetails {
  const mutation = {
    mutationId: "mutation-1",
    userId: "user-1",
    resource: "moments",
    clientId: "moment-1",
    kind: "patch",
    baseVersion: 1,
    changes: { content: "local text" },
    optimistic: {
      userId: "user-1",
      clientId: "moment-1",
      version: 1,
      createdAt: "2026-07-10T00:00:00.000Z",
      updatedAt: "2026-07-10T00:01:00.000Z",
      content: "local text",
      occurredOn: "2026-07-10",
      imagePath: null,
    },
    status: "conflict",
    attemptCount: 1,
    nextAttemptAt: "2026-07-10T00:01:00.000Z",
    createdAt: "2026-07-10T00:01:00.000Z",
    updatedAt: "2026-07-10T00:01:00.000Z",
  } satisfies MutationRecord<"moments">;
  return {
    conflictId: "conflict-1",
    mutationId: mutation.mutationId,
    userId: mutation.userId,
    resource: "moments",
    clientId: mutation.clientId,
    baseVersion: mutation.baseVersion,
    kind: mutation.kind,
    changes: mutation.changes,
    local: mutation.optimistic,
    remote: {
      ...mutation.optimistic,
      version: 2,
      content: "cloud text",
      occurredOn: "2026-07-11",
    },
    reason: "newer remote",
    createdAt: "2026-07-10T00:02:00.000Z",
    mutation,
    blobs,
  };
}

function habitConflict(): AnyConflictDetails {
  const local = {
    userId: "user-1",
    clientId: "habit-1",
    version: 1,
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-07-10T00:01:00.000Z",
    name: "Local name",
    description: "Local description",
    frequency: "daily" as const,
    color: null,
    startedOn: "2026-07-10",
  };
  const mutation = {
    mutationId: "habit-mutation",
    userId: "user-1",
    resource: "habits",
    clientId: "habit-1",
    kind: "patch",
    baseVersion: 1,
    changes: { name: "Local name" },
    optimistic: local,
    status: "conflict",
    attemptCount: 1,
    nextAttemptAt: local.updatedAt,
    createdAt: local.createdAt,
    updatedAt: local.updatedAt,
  } satisfies MutationRecord<"habits">;
  return {
    conflictId: "habit-conflict",
    mutationId: mutation.mutationId,
    userId: mutation.userId,
    resource: "habits",
    clientId: mutation.clientId,
    baseVersion: 1,
    kind: "patch",
    changes: mutation.changes,
    local,
    remote: {
      ...local,
      version: 2,
      name: "Cloud name",
      description: null,
      frequency: "weekly",
    },
    reason: "newer remote",
    createdAt: local.updatedAt,
    mutation,
    blobs: [],
  };
}

describe("conflict comparison interactions", () => {
  it("only presents business fields and marks the actual local patch intent", () => {
    const fields = conflictFields(momentConflict());

    expect(fields.map((field) => field.key)).toEqual([
      "content",
      "occurredOn",
      "imagePath",
    ]);
    expect(fields.map((field) => field.key)).not.toEqual(
      expect.arrayContaining([
        "userId",
        "clientId",
        "version",
        "createdAt",
        "updatedAt",
      ]),
    );
    expect(fields.find((field) => field.key === "content")).toMatchObject({
      local: "local text",
      remote: "cloud text",
      differs: true,
      changedLocally: true,
    });
    expect(fields.find((field) => field.key === "occurredOn")).toMatchObject({
      differs: true,
      changedLocally: false,
    });
  });

  it("defaults unchanged fields to cloud and records every source explicitly", () => {
    const details = momentConflict();
    const fields = conflictFields(details);
    let draft = createMergeDraft(details);

    expect(draft).toEqual({
      values: {
        content: "local text",
        occurredOn: "2026-07-11",
        imagePath: null,
      },
      sources: {
        content: "local",
        occurredOn: "remote",
        imagePath: "remote",
      },
    });
    draft = chooseConflictValue(
      draft,
      fields.find((field) => field.key === "content")!,
      "remote",
    );
    draft = editConflictValue(draft, "content", "combined text");

    expect(draft.sources.content).toBe("custom");
    expect(validateConflictMerge(details, draft)).toMatchObject({
      valid: true,
      changes: {
        content: "combined text",
        occurredOn: "2026-07-11",
        imagePath: null,
      },
    });
  });

  it("shows a pending image blob even when both image paths are null", () => {
    const blob = {
      blobId: "blob-1",
      mutationId: "mutation-1",
      userId: "user-1",
      slot: "image",
      blob: new Blob(["pixels"], { type: "image/png" }),
      fileName: "local.png",
      mimeType: "image/png",
      createdAt: "2026-07-10T00:01:00.000Z",
    } satisfies MutationBlobRecord;
    const image = conflictFields(momentConflict([blob])).find(
      (field) => field.key === "imagePath",
    )!;

    expect(image).toMatchObject({ differs: true, pendingBlob: blob });
    expect(formatConflictValue(image.local, "en", image.pendingBlob)).toBe(
      "Pending upload: local.png",
    );
  });

  it("normalizes nullable blanks and rejects required, enum, and date errors", () => {
    const details = habitConflict();
    let draft = createMergeDraft(details);
    draft = editConflictValue(draft, "description", "");
    draft = editConflictValue(draft, "name", "   ");
    draft = editConflictValue(draft, "frequency", "sometimes");
    draft = editConflictValue(draft, "startedOn", "2026-02-31");

    const invalid = validateConflictMerge(details, draft);
    expect(invalid).toMatchObject({
      valid: false,
      changes: { description: null },
      errors: {
        name: "required",
        frequency: "enum",
        startedOn: "date",
      },
    });

    draft = editConflictValue(draft, "name", "Read");
    draft = editConflictValue(draft, "frequency", "daily");
    draft = editConflictValue(draft, "startedOn", "2026-02-28");
    expect(validateConflictMerge(details, draft)).toMatchObject({
      valid: true,
      changes: { description: null, name: "Read", frequency: "daily" },
    });
    expect(conflictFieldLabel("content", "zh")).toBe("内容");
  });
});
