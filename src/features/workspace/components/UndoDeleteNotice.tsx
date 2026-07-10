"use client";

import { Undo2 } from "lucide-react";
import { useLanguage } from "../../../shared/i18n/LanguageContext";

export function UndoDeleteNotice({
  itemName,
  onUndo,
}: {
  itemName: string;
  onUndo: () => void;
}) {
  const { language } = useLanguage();

  return (
    <div
      role="status"
      className="fixed bottom-5 left-1/2 z-[70] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 shadow-lg"
    >
      <p className="min-w-0 flex-1 truncate text-sm text-[var(--color-text-primary)]">
        {language === "en" ? `${itemName} deleted` : `已删除 ${itemName}`}
      </p>
      <button
        type="button"
        onClick={onUndo}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 px-2 text-sm font-semibold text-[var(--color-primary)] hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
      >
        <Undo2 size={16} />
        {language === "en" ? "Undo" : "撤销"}
      </button>
    </div>
  );
}
