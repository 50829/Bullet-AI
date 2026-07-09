import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("useGoalPlanningPage boundaries", () => {
  it("uses the provided goals controller instead of instantiating useGoals", () => {
    const source = readFileSync(
      new URL("./useGoalPlanningPage.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain("goalsController");
    expect(source).not.toMatch(/useGoals\(/);
  });
});
