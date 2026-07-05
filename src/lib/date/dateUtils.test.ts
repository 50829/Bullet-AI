import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDateKey,
  isDateKeyAfter,
  isDateKeyBefore,
  toDateKey,
} from "./dateUtils";

describe("dateUtils", () => {
  it("formats Date values as local date keys", () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("adds and subtracts days across month boundaries", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("compares date keys lexicographically", () => {
    expect(isDateKeyBefore("2026-01-01", "2026-01-02")).toBe(true);
    expect(isDateKeyAfter("2026-01-03", "2026-01-02")).toBe(true);
  });

  it("formats date keys for supported locales", () => {
    expect(formatDateKey("2026-06-20", "zh")).toBe("2026年6月20日");
    expect(formatDateKey("2026-06-20", "en")).toContain("2026");
  });
});
