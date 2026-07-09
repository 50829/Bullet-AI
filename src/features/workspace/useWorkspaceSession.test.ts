import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("useWorkspaceSession dead-letter diagnostics wiring", () => {
  it("exposes dead-letter diagnostics and per-item actions", () => {
    const source = readFileSync(
      new URL("./useWorkspaceSession.ts", import.meta.url),
      "utf8",
    );
    const typeSource = readFileSync(new URL("./types.ts", import.meta.url), {
      encoding: "utf8",
    });

    expect(source).toContain("listDeadOutboxDiagnostics");
    expect(source).toContain("setDeadOutboxItems(items)");
    expect(source).toContain("retryDeadOutboxItem(userId, id)");
    expect(source).toContain("discardDeadOutboxItem(userId, id)");
    expect(typeSource).toContain("deadOutboxItems: DeadOutboxDiagnostic[]");
    expect(typeSource).toContain("retryDeadOutboxItem: (id: string)");
    expect(typeSource).toContain("discardDeadOutboxItem: (id: string)");
  });
});
