import { describe, expect, it } from "vitest";

import {
  getWorkspacePrefetchTargets,
  shouldSkipWorkspacePrefetch,
} from "./workspacePrefetch";

describe("workspace prefetch policy", () => {
  it("prioritizes likely destinations and excludes the current route", () => {
    expect(getWorkspacePrefetchTargets("/home")).toEqual([
      "/goals",
      "/moments",
      "/reflections",
    ]);
  });

  it("skips background work for constrained connections", () => {
    expect(shouldSkipWorkspacePrefetch({ saveData: true })).toBe(true);
    expect(shouldSkipWorkspacePrefetch({ effectiveType: "2g" })).toBe(true);
    expect(shouldSkipWorkspacePrefetch({ effectiveType: "4g" })).toBe(false);
  });
});
