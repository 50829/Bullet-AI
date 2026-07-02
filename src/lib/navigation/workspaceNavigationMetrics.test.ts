import { describe, expect, it } from "vitest";

import {
  markWorkspaceNavigationComplete,
  markWorkspaceNavigationStart,
} from "./workspaceNavigationMetrics";

describe("workspace navigation metrics", () => {
  it("measures only the pending target path", () => {
    markWorkspaceNavigationStart("/goals");

    expect(markWorkspaceNavigationComplete("/moments")).toBeNull();
    expect(markWorkspaceNavigationComplete("/goals")).toEqual(expect.any(Number));
  });
});
