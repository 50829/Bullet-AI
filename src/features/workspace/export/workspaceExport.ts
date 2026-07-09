import { getCollectionRepository } from "../../../lib/localDb/collectionRepository";
import { readRemoteCollection } from "../../../lib/localDb/remoteReader";
import type { LocalCollection } from "../../../lib/localDb/types";
import type { LocalFirstEntity } from "../../../lib/localFirst/types";
import { projectHabit } from "../../habits/habitProjection";
import type { HabitCheckin, HabitRecord, HabitView } from "../../habits/types";
import type { GoalRecord } from "../../goals/types";
import type { MomentRecord } from "../../moments/types";
import type { ReflectionRecord } from "../../reflections/types";

export type WorkspaceExportPayload = {
  exported_at: string;
  moments: MomentRecord[];
  goals: GoalRecord[];
  reflections: ReflectionRecord[];
  habits: HabitView[];
};

export function buildWorkspaceExportPayload(
  data: Omit<WorkspaceExportPayload, "exported_at">,
  exportedAt = new Date().toISOString(),
): WorkspaceExportPayload {
  return {
    exported_at: exportedAt,
    moments: data.moments,
    goals: data.goals,
    reflections: data.reflections,
    habits: data.habits,
  };
}

function exportIdentityFor(item: LocalFirstEntity) {
  return item.client_id || String(item.id);
}

function sortForExport<T extends LocalFirstEntity>(items: T[]) {
  return [...items].sort((a, b) => {
    const created = b.created_at.localeCompare(a.created_at);
    if (created !== 0) return created;
    return exportIdentityFor(a).localeCompare(exportIdentityFor(b));
  });
}

function isLocalExportOverride(item: LocalFirstEntity) {
  return Boolean(item._local?.pending || item._local?.failed);
}

export function mergeRemoteWithLocalOverrides<T extends LocalFirstEntity>(
  remoteRows: T[],
  localRows: T[],
) {
  const byIdentity = new Map<string, T>();
  remoteRows.forEach((row) => {
    byIdentity.set(exportIdentityFor(row), row);
  });
  localRows.filter(isLocalExportOverride).forEach((row) => {
    byIdentity.set(exportIdentityFor(row), row);
  });
  return sortForExport([...byIdentity.values()]);
}

async function listLocalRows<T extends LocalFirstEntity>(
  userId: string,
  collection: LocalCollection,
) {
  const repository = getCollectionRepository<T>(collection);
  return repository.list(userId);
}

async function loadCollectionForExport<T extends LocalFirstEntity>(
  userId: string,
  collection: LocalCollection,
) {
  const localRows = await listLocalRows<T>(userId, collection);
  const remoteRows = await readRemoteCollection<T>(userId, collection);
  return mergeRemoteWithLocalOverrides(remoteRows, localRows);
}

export async function loadWorkspaceExportPayload(
  userId: string,
  exportedAt = new Date().toISOString(),
) {
  const [moments, goals, reflections, habits, checkins] = await Promise.all([
    loadCollectionForExport<MomentRecord>(userId, "moments"),
    loadCollectionForExport<GoalRecord>(userId, "goals"),
    loadCollectionForExport<ReflectionRecord>(userId, "reflections"),
    loadCollectionForExport<HabitRecord>(userId, "habits"),
    loadCollectionForExport<HabitCheckin>(userId, "habit_checkins"),
  ]);

  return buildWorkspaceExportPayload(
    {
      moments,
      goals,
      reflections,
      habits: habits.map((habit) => projectHabit(habit, checkins)),
    },
    exportedAt,
  );
}

export function downloadJsonFile(payload: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
