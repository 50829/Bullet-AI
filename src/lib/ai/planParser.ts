import { parseInternalGoalPlan, type GoalPlan } from "./goalPlan";

type PlanMatch = {
  start: number;
  end: number;
  plan: GoalPlan;
};

const FENCED_BLOCK_PATTERN = /```([^\r\n`]*)\r?\n([\s\S]*?)```/g;

function parsePlanCandidate(candidate: string): GoalPlan | null {
  try {
    const parsed = JSON.parse(candidate.trim());
    return parseInternalGoalPlan(parsed);
  } catch {
    return null;
  }
}

function findJsonObjectEnd(text: string, start: number) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }

    if (character === '"') inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }

  return null;
}

function findPlanMatch(text: string): PlanMatch | null {
  const fencedRanges: Array<{ start: number; end: number }> = [];
  for (const match of text.matchAll(FENCED_BLOCK_PATTERN)) {
    const start = match.index;
    const end = start + match[0].length;
    fencedRanges.push({ start, end });

    const language = match[1].trim().toLowerCase();
    if (language && language !== "json") continue;

    const plan = parsePlanCandidate(match[2]);
    if (plan) return { start, end, plan };
  }

  for (
    let start = text.indexOf("{");
    start >= 0;
    start = text.indexOf("{", start + 1)
  ) {
    if (
      fencedRanges.some((range) => start >= range.start && start < range.end)
    ) {
      continue;
    }

    const end = findJsonObjectEnd(text, start);
    if (!end) continue;
    const plan = parsePlanCandidate(text.slice(start, end));
    if (plan) return { start, end, plan };
  }

  return null;
}

export function parsePlanReply(text: string): {
  reply: string;
  plan: GoalPlan | null;
} {
  const match = findPlanMatch(text);
  if (!match) return { reply: text, plan: null };

  return {
    reply: `${text.slice(0, match.start)}${text.slice(match.end)}`.trim(),
    plan: match.plan,
  };
}
