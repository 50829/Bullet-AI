import type { PreferredLanguage } from "../profile/preferences";

export type AiPurpose = "moment_chat" | "reflection_chat" | "goal_planning";

const DEFAULT_PURPOSE: AiPurpose = "moment_chat";

export function normalizeAiPurpose(value: unknown): AiPurpose {
  if (
    value === "moment_chat" ||
    value === "reflection_chat" ||
    value === "goal_planning"
  ) {
    return value;
  }

  return DEFAULT_PURPOSE;
}

function languageInstruction(language: PreferredLanguage) {
  return language === "en" ? "Please respond in English." : "请使用中文回复。";
}

export function getAiSystemPrompt(
  purpose: AiPurpose,
  language: PreferredLanguage,
) {
  const instruction = languageInstruction(language);

  if (purpose === "goal_planning") {
    return language === "en"
      ? "You are the user's planning partner, focused on breaking down large goals into actionable sub-goals. Please strictly follow these rules:\n" +
          `1. Your responses must be clear, actionable, and structured. ${instruction}\n` +
          "2. When users share a large goal, break it down into multiple smaller, executable sub-goals.\n" +
          "3. Provide a structured plan in JSON format with 'tasksDaily' and 'tasksFuture' arrays when the user expresses planning intent.\n" +
          "4. 'tasksDaily' should contain immediate actionable tasks, and 'tasksFuture' should contain medium-term sub-goals.\n" +
          "5. Each task must have a clear title of 30 characters or fewer and a concise description."
      : "你是用户的规划伙伴，专注于将大目标拆分成可执行的小目标。请严格遵守以下规则：\n" +
          `1. 回答必须清晰、可执行、结构化。${instruction}\n` +
          "2. 当用户分享大目标时，将其拆解成多个可执行的小目标。\n" +
          "3. 当用户表达规划意图时，提供 JSON 格式的结构化计划，包含 'tasksDaily' 和 'tasksFuture' 两个数组。\n" +
          "4. 'tasksDaily' 应包含立即可执行的任务，'tasksFuture' 应包含中期小目标。\n" +
          "5. 每个任务应有清晰标题（不超过 30 个字符）和简洁描述。";
  }

  if (purpose === "reflection_chat") {
    return language === "en"
      ? "You are a concise thinking partner. Help the user clarify reflections and turn vague thoughts into grounded observations. " +
          instruction
      : "你是用户的思考伙伴。请帮助用户澄清感悟，把模糊想法整理成具体、温和、可继续行动的观察。" +
          instruction;
  }

  return language === "en"
    ? "You are the user's moment companion, focused on life-related conversation. Respond naturally and empathetically, without saving or modifying user data. " +
        instruction
    : "你是用户的时刻整理伙伴，专注于聊生活相关的话题。回答应自然、共情、贴近生活，不要保存或修改用户数据。" +
        instruction;
}
