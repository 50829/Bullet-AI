import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("DataSettingsSection dead-letter diagnostics wiring", () => {
  it("renders diagnostics rows with per-item retry and confirmed discard wiring", () => {
    const source = readFileSync(
      new URL("./DataSettingsSection.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("deadOutboxItems.length > 0");
    expect(source).toContain("item.collection");
    expect(source).toContain("item.entityId");
    expect(source).toContain("item.operation");
    expect(source).toContain("item.errorKind");
    expect(source).toContain("item.attemptCount");
    expect(source).toContain("await onRetryDeadOutboxItem(id)");
    expect(source).toContain("retryOne(item.id)");
    expect(source).toContain("setDiscardTarget(item)");
    expect(source).toContain("<ConfirmDialog");
    expect(source).toContain("onDiscardDeadOutboxItem(discardTarget.id)");
  });
});
