"use client";

import { useCallback } from "react";
import { useToast } from "../../../shared/components/ui/Toast";
import { useWorkspaceSessionContext } from "../WorkspaceContext";
import {
  downloadJsonFile,
  loadWorkspaceExportPayload,
} from "./workspaceExport";

export function useWorkspaceExport() {
  const { userId } = useWorkspaceSessionContext();
  const { showToast } = useToast();

  const handleExport = useCallback(async () => {
    if (!userId) {
      showToast({ type: "error", message: "请先登录后再导出数据" });
      return;
    }

    try {
      const payload = await loadWorkspaceExportPayload(userId);
      const dateKey = payload.exported_at.slice(0, 10);
      downloadJsonFile(payload, `bullet-ai-export-${dateKey}.json`);
    } catch (error) {
      showToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "导出失败，请稍后重试",
      });
    }
  }, [showToast, userId]);

  return { handleExport };
}
