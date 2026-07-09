import { describe, expect, it } from "vitest";
import { getLoginErrorMessage } from "./loginErrorMessage";

describe("getLoginErrorMessage", () => {
  it("formats OAuth callback errors for the login page", () => {
    expect(getLoginErrorMessage("Provider denied access")).toBe(
      "登录失败：Provider denied access",
    );
  });

  it("ignores empty error values", () => {
    expect(getLoginErrorMessage(null)).toBeNull();
    expect(getLoginErrorMessage("   ")).toBeNull();
  });
});
