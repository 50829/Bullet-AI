import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("useWorkspaceSession v2 diagnostics wiring", () => {
  it("derives status from the shared mutation store", () => {
    const source = readFileSync(
      new URL("./useWorkspaceSession.ts", import.meta.url),
      "utf8",
    );
    const typeSource = readFileSync(new URL("./types.ts", import.meta.url), {
      encoding: "utf8",
    });

    expect(source).toContain("store.getDiagnostics(userId)");
    expect(source).toContain('mutation.status === "blocked"');
    expect(source).toContain('mutation.status === "conflict"');
    expect(source).toContain("worker?.requestFlush()");
    expect(source).toContain("store.discardMutation(id)");
    expect(source).not.toContain("localDb");
    expect(typeSource).toContain("pendingCount: number");
    expect(typeSource).toContain("syncIssues: SyncIssue[]");
    expect(typeSource).toContain("discardSyncItem: (id: string)");
  });
});
