import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RemoteMutationRequest } from "../../../lib/data-v2";

const mocks = vi.hoisted(() => {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.abortSignal = vi.fn(() => query);
  query.insert = vi.fn(() => query);
  query.update = vi.fn(() => query);
  query.delete = vi.fn(() => query);
  query.maybeSingle = vi.fn();
  query.single = vi.fn();

  return {
    query,
    from: vi.fn(() => query),
    createSignedUrl: vi.fn(),
    upload: vi.fn(),
    remove: vi.fn(),
  };
});

vi.mock("../../../lib/supabase/client", () => ({
  supabase: {
    from: mocks.from,
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: mocks.createSignedUrl,
        upload: mocks.upload,
        remove: mocks.remove,
      })),
    },
  },
}));

const { createSignedMomentImageUrl, SupabaseRemoteMutationExecutor } =
  await import("./remoteRepositoryV2");

function recoveryCreate(content: string): RemoteMutationRequest<"moments"> {
  return {
    mutationId: "mutation-recovery",
    userId: "user-1",
    resource: "moments",
    clientId: "moment-1",
    kind: "create",
    baseVersion: null,
    changes: {
      content,
      occurredOn: "2026-07-10",
      imagePath: null,
    },
    optimistic: {
      clientId: "moment-1",
      userId: "user-1",
      version: 0,
      createdAt: "2026-07-10T00:00:00.000Z",
      updatedAt: "2026-07-10T00:01:00.000Z",
      content,
      occurredOn: "2026-07-10",
      imagePath: null,
    },
    blobs: [],
    conflictRecoveryCreate: true,
  };
}

describe("SupabaseRemoteMutationExecutor idempotency", () => {
  beforeEach(() => {
    mocks.from.mockClear();
    mocks.query.select.mockClear();
    mocks.query.eq.mockClear();
    mocks.query.abortSignal.mockClear();
    mocks.query.insert.mockClear();
    mocks.query.update.mockClear();
    mocks.query.delete.mockClear();
    mocks.query.maybeSingle.mockReset();
    mocks.query.single.mockReset();
    mocks.createSignedUrl.mockReset();
    mocks.upload.mockReset();
    mocks.remove.mockReset();
  });

  it("inserts habits with their original local start date", async () => {
    mocks.query.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.query.single.mockResolvedValue({
      data: {
        id: 1,
        client_id: "habit-1",
        user_id: "user-1",
        name: "Read",
        description: null,
        frequency: "daily",
        color: null,
        started_on: "2026-06-28",
        version: 1,
        created_at: "2026-07-10T00:00:00.000Z",
        updated_at: "2026-07-10T00:00:00.000Z",
      },
      error: null,
    });

    const result = await new SupabaseRemoteMutationExecutor().execute(
      {
        mutationId: "mutation-habit",
        userId: "user-1",
        resource: "habits",
        clientId: "habit-1",
        kind: "create",
        baseVersion: null,
        changes: {
          name: "Read",
          description: null,
          frequency: "daily",
          color: null,
          startedOn: "2026-06-28",
        },
        optimistic: {
          clientId: "habit-1",
          userId: "user-1",
          version: 0,
          createdAt: "2026-06-28T00:00:00.000Z",
          updatedAt: "2026-06-28T00:00:00.000Z",
          name: "Read",
          description: null,
          frequency: "daily",
          color: null,
          startedOn: "2026-06-28",
        },
        blobs: [],
      },
      new AbortController().signal,
    );

    expect(mocks.query.insert).toHaveBeenCalledWith({
      client_id: "habit-1",
      user_id: "user-1",
      name: "Read",
      description: null,
      frequency: "daily",
      color: null,
      started_on: "2026-06-28",
    });
    expect(result).toMatchObject({
      kind: "applied",
      entity: { startedOn: "2026-06-28" },
    });
  });

  it("reopens a conflict when a deleted record was recreated differently", async () => {
    mocks.query.maybeSingle.mockResolvedValue({
      data: {
        id: 1,
        client_id: "moment-1",
        user_id: "user-1",
        content: "different cloud copy",
        occurred_on: "2026-07-10",
        image_path: null,
        version: 1,
        created_at: "2026-07-10T00:00:00.000Z",
        updated_at: "2026-07-10T00:01:00.000Z",
      },
      error: null,
    });

    await expect(
      new SupabaseRemoteMutationExecutor().execute(
        recoveryCreate("restore local copy"),
        new AbortController().signal,
      ),
    ).resolves.toMatchObject({
      kind: "conflict",
      remote: { content: "different cloud copy" },
    });
    expect(mocks.query.insert).not.toHaveBeenCalled();
  });

  it("treats an identical recovery create as an idempotent retry", async () => {
    mocks.query.maybeSingle.mockResolvedValue({
      data: {
        id: 1,
        client_id: "moment-1",
        user_id: "user-1",
        content: "restore local copy",
        occurred_on: "2026-07-10",
        image_path: null,
        version: 1,
        created_at: "2026-07-10T00:00:00.000Z",
        updated_at: "2026-07-10T00:01:00.000Z",
      },
      error: null,
    });

    await expect(
      new SupabaseRemoteMutationExecutor().execute(
        recoveryCreate("restore local copy"),
        new AbortController().signal,
      ),
    ).resolves.toMatchObject({
      kind: "applied",
      entity: { content: "restore local copy" },
    });
    expect(mocks.query.insert).not.toHaveBeenCalled();
  });

  it("accepts a previously committed image patch without deleting its object", async () => {
    const imagePath = "user-1/moment-1/mutation-1.jpg";
    mocks.query.maybeSingle.mockResolvedValue({
      data: {
        id: 1,
        client_id: "moment-1",
        user_id: "user-1",
        content: "updated",
        occurred_on: "2026-07-10",
        image_path: imagePath,
        version: 2,
        created_at: "2026-07-10T00:00:00.000Z",
        updated_at: "2026-07-10T00:01:00.000Z",
      },
      error: null,
    });
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://example.test/signed" },
      error: null,
    });

    const result = await new SupabaseRemoteMutationExecutor().execute(
      {
        mutationId: "mutation-1",
        userId: "user-1",
        resource: "moments",
        clientId: "moment-1",
        kind: "patch",
        baseVersion: 1,
        changes: {
          content: "updated",
          imagePath: null,
        },
        optimistic: {
          clientId: "moment-1",
          userId: "user-1",
          version: 1,
          createdAt: "2026-07-10T00:00:00.000Z",
          updatedAt: "2026-07-10T00:01:00.000Z",
          content: "updated",
          occurredOn: "2026-07-10",
          imagePath: null,
        },
        blobs: [
          {
            blobId: "blob-1",
            mutationId: "mutation-1",
            userId: "user-1",
            slot: "image",
            blob: new Blob(["image"], { type: "image/jpeg" }),
            fileName: "photo.jpg",
            mimeType: "image/jpeg",
            createdAt: "2026-07-10T00:01:00.000Z",
          },
        ],
      },
      new AbortController().signal,
    );

    expect(result).toMatchObject({
      kind: "applied",
      entity: { version: 2, imagePath },
    });
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("never removes an uploaded path still referenced by a newer remote version", async () => {
    const imagePath = "user-1/moment-1/mutation-1.jpg";
    mocks.query.maybeSingle.mockResolvedValue({
      data: {
        id: 1,
        client_id: "moment-1",
        user_id: "user-1",
        content: "changed elsewhere",
        occurred_on: "2026-07-10",
        image_path: imagePath,
        version: 3,
        created_at: "2026-07-10T00:00:00.000Z",
        updated_at: "2026-07-10T00:02:00.000Z",
      },
      error: null,
    });
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://example.test/signed" },
      error: null,
    });
    mocks.upload.mockResolvedValue({ error: null });

    const result = await new SupabaseRemoteMutationExecutor().execute(
      {
        mutationId: "mutation-1",
        userId: "user-1",
        resource: "moments",
        clientId: "moment-1",
        kind: "patch",
        baseVersion: 1,
        changes: { content: "updated", imagePath: null },
        optimistic: {
          clientId: "moment-1",
          userId: "user-1",
          version: 1,
          createdAt: "2026-07-10T00:00:00.000Z",
          updatedAt: "2026-07-10T00:01:00.000Z",
          content: "updated",
          occurredOn: "2026-07-10",
          imagePath: null,
        },
        blobs: [
          {
            blobId: "blob-1",
            mutationId: "mutation-1",
            userId: "user-1",
            slot: "image",
            blob: new Blob(["image"], { type: "image/jpeg" }),
            fileName: "photo.jpg",
            mimeType: "image/jpeg",
            createdAt: "2026-07-10T00:01:00.000Z",
          },
        ],
      },
      new AbortController().signal,
    );

    expect(result).toMatchObject({ kind: "conflict", remote: { version: 3 } });
    expect(mocks.upload).toHaveBeenCalledOnce();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("keeps a hard delete retryable until its image is removed", async () => {
    mocks.query.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.remove.mockResolvedValue({ error: new Error("network unavailable") });

    const result = await new SupabaseRemoteMutationExecutor().execute(
      {
        mutationId: "mutation-delete",
        userId: "user-1",
        resource: "moments",
        clientId: "moment-1",
        kind: "delete",
        baseVersion: 2,
        changes: null,
        optimistic: {
          clientId: "moment-1",
          userId: "user-1",
          version: 2,
          createdAt: "2026-07-10T00:00:00.000Z",
          updatedAt: "2026-07-10T00:01:00.000Z",
          content: "delete me",
          occurredOn: "2026-07-10",
          imagePath: "user-1/moment-1/original.jpg",
        },
        blobs: [],
      },
      new AbortController().signal,
    );

    expect(mocks.remove).toHaveBeenCalledWith(["user-1/moment-1/original.jpg"]);
    expect(result).toMatchObject({ kind: "transient" });
  });

  it("removes the old object when an image is cleared", async () => {
    const originalPath = "user-1/moment-1/original.jpg";
    mocks.query.maybeSingle
      .mockResolvedValueOnce({
        data: {
          id: 1,
          client_id: "moment-1",
          user_id: "user-1",
          content: "moment",
          occurred_on: "2026-07-10",
          image_path: originalPath,
          version: 1,
          created_at: "2026-07-10T00:00:00.000Z",
          updated_at: "2026-07-10T00:00:00.000Z",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: 1,
          client_id: "moment-1",
          user_id: "user-1",
          content: "moment",
          occurred_on: "2026-07-10",
          image_path: null,
          version: 2,
          created_at: "2026-07-10T00:00:00.000Z",
          updated_at: "2026-07-10T00:01:00.000Z",
        },
        error: null,
      });
    mocks.remove.mockResolvedValue({ error: null });

    const result = await new SupabaseRemoteMutationExecutor().execute(
      {
        mutationId: "mutation-clear",
        userId: "user-1",
        resource: "moments",
        clientId: "moment-1",
        kind: "patch",
        baseVersion: 1,
        changes: { imagePath: null },
        cleanup: { momentImagePath: originalPath },
        optimistic: {
          clientId: "moment-1",
          userId: "user-1",
          version: 1,
          createdAt: "2026-07-10T00:00:00.000Z",
          updatedAt: "2026-07-10T00:01:00.000Z",
          content: "moment",
          occurredOn: "2026-07-10",
          imagePath: null,
        },
        blobs: [],
      },
      new AbortController().signal,
    );

    expect(mocks.remove).toHaveBeenCalledWith([originalPath]);
    expect(result).toMatchObject({
      kind: "applied",
      entity: { version: 2, imagePath: null },
    });
  });

  it("retries cleanup when an image patch was already committed", async () => {
    mocks.query.maybeSingle.mockResolvedValue({
      data: {
        id: 1,
        client_id: "moment-1",
        user_id: "user-1",
        content: "moment",
        occurred_on: "2026-07-10",
        image_path: null,
        version: 2,
        created_at: "2026-07-10T00:00:00.000Z",
        updated_at: "2026-07-10T00:01:00.000Z",
      },
      error: null,
    });
    mocks.remove.mockResolvedValue({ error: new Error("network unavailable") });

    const result = await new SupabaseRemoteMutationExecutor().execute(
      {
        mutationId: "mutation-clear",
        userId: "user-1",
        resource: "moments",
        clientId: "moment-1",
        kind: "patch",
        baseVersion: 1,
        changes: { imagePath: null },
        cleanup: { momentImagePath: "user-1/moment-1/original.jpg" },
        optimistic: {
          clientId: "moment-1",
          userId: "user-1",
          version: 1,
          createdAt: "2026-07-10T00:00:00.000Z",
          updatedAt: "2026-07-10T00:01:00.000Z",
          content: "moment",
          occurredOn: "2026-07-10",
          imagePath: null,
        },
        blobs: [],
      },
      new AbortController().signal,
    );

    expect(result).toMatchObject({ kind: "transient" });
  });

  it("classifies rate limits as transient", async () => {
    mocks.query.maybeSingle.mockResolvedValue({
      data: null,
      error: { code: "", message: "Too many requests", status: 429 },
    });

    const result = await new SupabaseRemoteMutationExecutor().execute(
      {
        mutationId: "mutation-rate-limit",
        userId: "user-1",
        resource: "moments",
        clientId: "moment-1",
        kind: "delete",
        baseVersion: 1,
        changes: null,
        optimistic: {
          clientId: "moment-1",
          userId: "user-1",
          version: 1,
          createdAt: "2026-07-10T00:00:00.000Z",
          updatedAt: "2026-07-10T00:00:00.000Z",
          content: "moment",
          occurredOn: "2026-07-10",
          imagePath: null,
        },
        blobs: [],
      },
      new AbortController().signal,
    );

    expect(result).toMatchObject({ kind: "transient" });
  });
});

describe("createSignedMomentImageUrl", () => {
  it("surfaces signing failures so the view can retry", async () => {
    mocks.createSignedUrl.mockResolvedValue({
      data: null,
      error: new Error("signing unavailable"),
    });

    await expect(
      createSignedMomentImageUrl("user-1/moment-1/image.jpg"),
    ).rejects.toThrow("signing unavailable");
  });
});
