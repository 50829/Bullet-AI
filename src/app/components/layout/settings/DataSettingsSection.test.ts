import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("DataSettingsSection v2 diagnostics wiring", () => {
  it("renders actionable conflicts without exposing a dead-letter queue", () => {
    const source = readFileSync(
      new URL("./DataSettingsSection.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("syncIssues.length > 0");
    expect(source).toContain("item.resource");
    expect(source).toContain("item.operation");
    expect(source).toContain("item.status");
    expect(source).toContain("item.error");
    expect(source).toContain("setDiscardTarget(item)");
    expect(source).toContain("<ConfirmDialog");
    expect(source).toContain("onDiscardSyncItem(discardTarget.id)");
    expect(source).not.toContain("deadOutbox");
  });
});
