"use client";

import { Send } from "lucide-react";
import { useLanguage } from "@/shared/i18n/LanguageContext";

type ChatComposerProps = {
  value: string;
  placeholder?: string;
  loading: boolean;
  onChange: (value: string) => void;
  onSend: () => void | Promise<void>;
};

export function ChatComposer({
  value,
  placeholder,
  loading,
  onChange,
  onSend,
}: ChatComposerProps) {
  const { t } = useLanguage();

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void onSend();
    }
  };

  return (
    <div className="border-t border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-4">
      <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-2">
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            placeholder || t("aiInputPlaceholder") || "输入你的想法..."
          }
          disabled={loading}
          className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-2 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-secondary)]"
        />
        <button
          type="button"
          onClick={() => void onSend()}
          disabled={loading || !value.trim()}
          className="rounded-lg bg-[var(--color-primary)] p-2.5 text-[var(--color-text-on-primary)] transition-colors duration-150 hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
          aria-label={t("send") || "发送"}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
