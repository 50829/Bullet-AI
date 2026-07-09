import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDateButtonLabel,
  formatDateKey,
  formatMonthLabel,
  getWeekdayLabels,
  isDateKeyAfter,
  isDateKeyBefore,
  isDateKeyWithinRange,
  parseDateKey,
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

  it("parses valid date keys and rejects invalid dates", () => {
    expect(parseDateKey("2026-07-09")?.getDate()).toBe(9);
    expect(parseDateKey("2026-02-31")).toBeNull();
    expect(parseDateKey("07/09/2026")).toBeNull();
  });

  it("checks date keys against optional ranges", () => {
    expect(isDateKeyWithinRange("2026-07-09")).toBe(true);
    expect(isDateKeyWithinRange("2026-07-09", "2026-07-01")).toBe(true);
    expect(isDateKeyWithinRange("2026-06-30", "2026-07-01")).toBe(false);
    expect(isDateKeyWithinRange("2026-07-10", undefined, "2026-07-09")).toBe(
      false,
    );
  });

  it("formats month and button labels", () => {
    expect(formatMonthLabel(new Date(2026, 6, 1), "zh")).toContain("2026");
    expect(formatMonthLabel(new Date(2026, 6, 1), "en")).toBe("July 2026");
    expect(formatDateButtonLabel("2026-07-09", "zh")).toContain("7月9日");
  });

  it("rotates weekday labels by week start", () => {
    expect(getWeekdayLabels("zh", 1)[0]).toBe("一");
    expect(getWeekdayLabels("en", 0)[0]).toBe("Sun");
    expect(getWeekdayLabels("en", 6)[0]).toBe("Sat");
  });
});
