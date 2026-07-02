import { describe, expect, it } from "vitest";

import { isPasswordStrong } from "./passwordValidation";

describe("isPasswordStrong", () => {
  it.each(["Abcdefg1", "Secure99", "Pass_word2", "Good-pass3"])(
    "accepts a password that meets the required character groups: %s",
    (password) => {
      expect(isPasswordStrong(password)).toBe(true);
    },
  );

  it.each([
    "Short1!",
    "lowercase1!",
    "UPPERCASE1!",
    "NoNumber!",
  ])("rejects a password missing a requirement: %s", (password) => {
    expect(isPasswordStrong(password)).toBe(false);
  });
});
