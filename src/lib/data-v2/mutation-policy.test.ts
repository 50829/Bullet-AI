import { describe, expect, it } from "vitest";
import { compactQueuedMutation, rebaseQueuedMutation } from "./mutation-policy";
import type { MutationRecord } from "./types";

const moment = {
  userId: "user-1",
  clientId: "moment-1",
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  content: "one",
  occurredOn: "2026-01-01",
  imagePath: null,
};

function mutation(
  kind: "create" | "patch" = "patch",
): MutationRecord<"moments"> {
  const common = {
    mutationId: "mutation-1",
    userId: "user-1",
    resource: "moments" as const,
    clientId: "moment-1",
    optimistic: moment,
    status: "queued" as const,
    attemptCount: 0,
    nextAttemptAt: moment.updatedAt,
    createdAt: moment.createdAt,
    updatedAt: moment.updatedAt,
  };
  return kind === "create"
    ? {
        ...common,
        kind,
        baseVersion: null,
        changes: { content: "one", occurredOn: "2026-01-01", imagePath: null },
      }
    : { ...common, kind, baseVersion: 1, changes: { content: "one" } };
}

describe("mutation policy", () => {
  it("folds create plus patch into one create", () => {
    const result = compactQueuedMutation(
      mutation("create"),
      {
        userId: "user-1",
        resource: "moments",
        clientId: "moment-1",
        kind: "patch",
        baseVersion: 0,
        changes: { content: "two" },
        optimistic: { ...moment, content: "two" },
      },
      "2026-01-02T00:00:00.000Z",
    );

    expect(result).toMatchObject({
      kind: "create",
      baseVersion: null,
      changes: { content: "two", occurredOn: "2026-01-01" },
    });
  });

  it("cancels a never-sent create followed by delete", () => {
    expect(
      compactQueuedMutation(
        mutation("create"),
        {
          userId: "user-1",
          resource: "moments",
          clientId: "moment-1",
          kind: "delete",
          baseVersion: 0,
          optimistic: moment,
        },
        moment.updatedAt,
      ),
    ).toBe("cancel");
  });

  it("keeps the first CAS version while merging patches", () => {
    const result = compactQueuedMutation(
      mutation(),
      {
        userId: "user-1",
        resource: "moments",
        clientId: "moment-1",
        kind: "patch",
        baseVersion: 99,
        changes: { imagePath: "user-1/new.jpg" },
        cleanup: { momentImagePath: "user-1/old.jpg" },
        optimistic: { ...moment, imagePath: "user-1/new.jpg" },
      },
      moment.updatedAt,
    );

    expect(result).toMatchObject({
      baseVersion: 1,
      changes: { content: "one", imagePath: "user-1/new.jpg" },
      cleanup: { momentImagePath: "user-1/old.jpg" },
    });
  });

  it("rebases a queued successor onto the applied server version", () => {
    const result = rebaseQueuedMutation(
      mutation(),
      { ...moment, version: 8, content: "server" },
      "2026-01-03T00:00:00.000Z",
    );
    expect(result).toMatchObject({
      baseVersion: 8,
      optimistic: { version: 8, content: "one" },
    });
  });
});
