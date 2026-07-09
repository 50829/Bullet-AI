import type { WorkspaceDataCollections } from "../data";

export type WorkspaceExportPayload = {
  exported_at: string;
  moments: WorkspaceDataCollections["moments"]["moments"];
  goals: WorkspaceDataCollections["goals"]["goals"];
  reflections: WorkspaceDataCollections["reflections"]["reflections"];
  habits: WorkspaceDataCollections["habits"]["habits"];
};

export function buildWorkspaceExportPayload(
  data: WorkspaceDataCollections,
  exportedAt = new Date().toISOString(),
): WorkspaceExportPayload {
  return {
    exported_at: exportedAt,
    moments: data.moments.moments,
    goals: data.goals.goals,
    reflections: data.reflections.reflections,
    habits: data.habits.habits,
  };
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
