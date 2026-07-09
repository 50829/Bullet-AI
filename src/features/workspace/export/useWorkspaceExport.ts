"use client";

import { useCallback } from "react";
import { useWorkspaceData } from "../data";
import {
  buildWorkspaceExportPayload,
  downloadJsonFile,
} from "./workspaceExport";

export function useWorkspaceExport() {
  const { goals, habits, moments, reflections } = useWorkspaceData();

  const handleExport = useCallback(() => {
    const payload = buildWorkspaceExportPayload({
      goals,
      habits,
      moments,
      reflections,
    });
    const dateKey = payload.exported_at.slice(0, 10);
    downloadJsonFile(payload, `bullet-ai-export-${dateKey}.json`);
  }, [goals, habits, moments, reflections]);

  return { handleExport };
}
