"use client";

import { Sparkles } from "lucide-react";
import { Button } from "../../../shared/components/ui/Button";

type TopBarActionsProps = {
  syncFailed: boolean;
  syncFailedLabel: string;
  showButtons: boolean;
  showAssistantButton: boolean;
  assistantButtonLabel: string;
  addButtonText: string;
  mobile: boolean;
  onToggleAIPanel?: () => void;
  onAdd?: () => void;
};

export function TopBarActions({
  syncFailed,
  syncFailedLabel,
  showButtons,
  showAssistantButton,
  assistantButtonLabel,
  addButtonText,
  mobile,
  onToggleAIPanel,
  onAdd,
}: TopBarActionsProps) {
  return (
    <div
      className={`flex shrink-0 items-center gap-2 ${mobile ? "ml-auto" : ""}`}
    >
      {syncFailed && (
        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
          {syncFailedLabel}
        </span>
      )}
      {showButtons && (
        <>
          {showAssistantButton && onToggleAIPanel && (
            <Button
              variant="outline"
              onClick={onToggleAIPanel}
              className="flex min-w-[40px] items-center justify-center px-2"
              title={assistantButtonLabel}
              aria-label={assistantButtonLabel}
            >
              <Sparkles size={16} />
            </Button>
          )}

          {onAdd && (
            <Button onClick={onAdd} className={mobile ? "px-3 text-sm" : ""}>
              {mobile ? "+" : addButtonText}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
