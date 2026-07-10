import { describe, expect, it } from "vitest";
import { MAX_GOAL_PLAN_TITLE_CHARS } from "./goalPlan";
import { parsePlanReply } from "./planParser";

describe("planParser", () => {
  it("extracts a fenced JSON plan", () => {
    const reply = [
      "好的，先这样做：",
      "```json",
      '{"tasksDaily":[{"title":"读文档","description":"看完部署说明"}],"tasksFuture":[]}',
      "```",
    ].join("\n");

    expect(parsePlanReply(reply)).toEqual({
      reply: "好的，先这样做：",
      plan: {
        daily: [{ title: "读文档", description: "看完部署说明" }],
        future: [],
      },
    });
  });

  it("removes only the successfully parsed plan block", () => {
    const reply = [
      "这里是计划。",
      "```json",
      '{"tasksDaily":[{"title":"行动","description":"今天完成"}],"tasksFuture":[]}',
      "```",
      "继续加油。",
    ].join("\n");

    expect(parsePlanReply(reply)).toEqual({
      reply: "这里是计划。\n\n继续加油。",
      plan: {
        daily: [{ title: "行动", description: "今天完成" }],
        future: [],
      },
    });
  });

  it("keeps ordinary and invalid fenced code unchanged", () => {
    const ordinaryCode = [
      "示例代码：",
      "```ts",
      "const plan = { tasksDaily: [], tasksFuture: [] };",
      "```",
    ].join("\n");
    expect(parsePlanReply(ordinaryCode)).toEqual({
      reply: ordinaryCode,
      plan: null,
    });

    const invalidPlan = [
      "```json",
      JSON.stringify({
        tasksDaily: [
          {
            title: "x".repeat(MAX_GOAL_PLAN_TITLE_CHARS + 1),
            description: "too long title",
          },
        ],
        tasksFuture: [],
      }),
      "```",
    ].join("\n");
    expect(parsePlanReply(invalidPlan)).toEqual({
      reply: invalidPlan,
      plan: null,
    });
  });

  it("extracts a valid inline plan without removing surrounding JSON-like text", () => {
    const reply =
      '保留 {not-json}，计划是 {"tasksDaily":[],"tasksFuture":[{"title":"复盘","description":"本周检查结果"}]} 完成。';

    expect(parsePlanReply(reply)).toEqual({
      reply: "保留 {not-json}，计划是  完成。",
      plan: {
        daily: [],
        future: [{ title: "复盘", description: "本周检查结果" }],
      },
    });
  });
});
