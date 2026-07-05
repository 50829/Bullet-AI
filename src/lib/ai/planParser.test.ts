import { describe, expect, it } from "vitest";
import {
  extractPlanFromReply,
  removePlanFromReply,
  toFrontendPlan,
} from "./planParser";

describe("planParser", () => {
  it("extracts a fenced JSON plan", () => {
    const reply = [
      "好的，先这样做：",
      "```json",
      '{"tasksDaily":[{"title":"读文档","description":"看完部署说明"}],"tasksFuture":[]}',
      "```",
    ].join("\n");

    expect(extractPlanFromReply(reply)).toEqual({
      tasksDaily: [{ title: "读文档", description: "看完部署说明" }],
      tasksFuture: [],
    });
  });

  it("removes plan blocks from assistant replies", () => {
    const reply = [
      "这里是计划。",
      "```json",
      '{"tasksDaily":[],"tasksFuture":[]}',
      "```",
      "继续加油。",
    ].join("\n");

    expect(removePlanFromReply(reply)).toBe("这里是计划。\n\n继续加油。");
  });

  it("normalizes internal plan shape for the frontend", () => {
    expect(
      toFrontendPlan({ tasksDaily: [{ title: "A", description: "B" }] }),
    ).toEqual({
      daily: [{ title: "A", description: "B" }],
      future: [],
    });
  });
});
