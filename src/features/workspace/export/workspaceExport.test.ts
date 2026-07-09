import { describe, expect, it } from "vitest";
import { buildWorkspaceExportPayload } from "./workspaceExport";

describe("workspaceExport", () => {
  it("builds a payload with exported_at and the four workspace collections", () => {
    const payload = buildWorkspaceExportPayload(
      {
        moments: { moments: [{ id: 1, content: "Moment" }] },
        goals: { goals: [{ id: 2, title: "Goal" }] },
        reflections: { reflections: [{ id: 3, content: "Reflection" }] },
        habits: { habits: [{ id: 4, name: "Habit" }] },
      } as never,
      "2026-07-09T00:00:00.000Z",
    );

    expect(payload).toEqual({
      exported_at: "2026-07-09T00:00:00.000Z",
      moments: [{ id: 1, content: "Moment" }],
      goals: [{ id: 2, title: "Goal" }],
      reflections: [{ id: 3, content: "Reflection" }],
      habits: [{ id: 4, name: "Habit" }],
    });
  });
});
