export type PlanTask = {
  title: string;
  description: string;
};

export type InternalPlan = {
  tasksDaily?: PlanTask[];
  tasksFuture?: PlanTask[];
};

export type FrontendPlan = {
  daily: PlanTask[];
  future: PlanTask[];
};

const FENCED_JSON_PATTERN = /```json([\s\S]*?)```/;
const FENCED_BLOCK_PATTERN = /```([\s\S]*?)```/;
const PLAN_OBJECT_PATTERN = /\{[\s\S]*"tasksDaily"[\s\S]*"tasksFuture"[\s\S]*\}/;

function isPlan(value: unknown): value is InternalPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as InternalPlan;
  return Array.isArray(plan.tasksDaily) || Array.isArray(plan.tasksFuture);
}

function parsePlanCandidate(candidate: string) {
  try {
    const parsed = JSON.parse(candidate.trim());
    return isPlan(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function extractPlanFromReply(text: string) {
  const fencedJson = text.match(FENCED_JSON_PATTERN)?.[1];
  if (fencedJson) {
    const plan = parsePlanCandidate(fencedJson);
    if (plan) return plan;
  }

  const fencedBlock = text.match(FENCED_BLOCK_PATTERN)?.[1];
  if (fencedBlock?.trim().startsWith("{")) {
    const plan = parsePlanCandidate(fencedBlock);
    if (plan) return plan;
  }

  const inlineObject = text.match(PLAN_OBJECT_PATTERN)?.[0];
  if (inlineObject) {
    const plan = parsePlanCandidate(inlineObject);
    if (plan) return plan;
  }

  return null;
}

export function removePlanFromReply(text: string) {
  return text
    .replace(/```json[\s\S]*?```/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(PLAN_OBJECT_PATTERN, "")
    .trim();
}

export function toFrontendPlan(plan: InternalPlan): FrontendPlan {
  return {
    daily: plan.tasksDaily ?? [],
    future: plan.tasksFuture ?? [],
  };
}
