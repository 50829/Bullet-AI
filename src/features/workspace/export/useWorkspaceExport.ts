"use client";

import { useCallback } from "react";
import { useToast } from "@/shared/components/ui/Toast";
import { useWorkspaceSessionContext } from "../WorkspaceContext";
import { useDataRuntime } from "@/data";
import {
  downloadJsonFile,
  loadWorkspaceExportPayload,
} from "./workspaceExport";

export function useWorkspaceExport() {
  const session = useWorkspaceSessionContext();
  const { store } = useDataRuntime();
  const { showToast } = useToast();

  const handleExport = useCallback(async () => {
    if (!session.userId) {
      showToast({ type: "error", message: "请先登录后再导出数据" });
      return;
    }

    try {
      const payload = await loadWorkspaceExportPayload(session.userId, store);
      const dateKey = payload.exportedAt.slice(0, 10);
      downloadJsonFile(payload, `bullet-ai-export-${dateKey}.json`);
    } catch (error) {
      showToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "导出失败，请稍后重试",
      });
    }
  }, [session.userId, showToast, store]);

  return { handleExport };
}
