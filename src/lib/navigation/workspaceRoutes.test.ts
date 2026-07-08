import { describe, expect, it } from "vitest";

import { getWorkspacePageFromPathname, isWorkspacePath } from "./workspaceRoutes";

describe("workspace routes", () => {
  it("matches workspace roots and nested paths", () => {
    expect(isWorkspacePath("/goals")).toBe(true);
    expect(isWorkspacePath("/goals/archive")).toBe(true);
    expect(isWorkspacePath("/login")).toBe(false);
    expect(isWorkspacePath("/goals-archive")).toBe(false);
  });

  it("resolves nested paths to their workspace page", () => {
    expect(getWorkspacePageFromPathname("/moments/123")).toBe("moments");
    expect(getWorkspacePageFromPathname("/unknown")).toBe("home");
  });
});
