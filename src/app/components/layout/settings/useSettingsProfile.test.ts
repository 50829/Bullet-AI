import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("useSettingsProfile boundaries", () => {
  it("does not instantiate workspace collection hooks or own export handling", () => {
    const source = readFileSync(
      new URL("./useSettingsProfile.ts", import.meta.url),
      "utf8",
    );

    expect(source).not.toMatch(
      /useGoals\(|useHabits\(|useMoments\(|useReflections\(/,
    );
    expect(source).not.toContain("handleExport");
  });
});
