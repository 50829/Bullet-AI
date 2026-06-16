import { supabase } from "../../../lib/supabase/client";
import type { CreateGoalInput, GoalPlan } from "../types";

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw new Error(error.message);
  if (!user) throw new Error("请先登录");

  return user;
}

export async function addGoalPlanToMigrationList(plan: GoalPlan) {
  const user = await getCurrentUser();
  const tasks = [...plan.daily, ...plan.future].map((task) => ({
    user_id: user.id,
    title: task.title,
    description: task.description,
    due_date: null,
  }));

  if (tasks.length === 0) return;

  const { error } = await supabase.from("goals").insert(tasks);
  if (error) throw new Error(error.message);
}

export async function createGoal(input: CreateGoalInput) {
  const user = await getCurrentUser();
  const { error } = await supabase.from("goals").insert({
    user_id: user.id,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    due_date: input.dueDate ?? null,
  });

  if (error) throw new Error(error.message);
}
