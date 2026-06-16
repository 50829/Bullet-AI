
import React from "react";

type LoadingStateProps = {
  label?: string;
  className?: string;
};

export function LoadingState({ label = "Loading", className = "" }: LoadingStateProps) {
  return (
    <div className={`flex min-h-[220px] items-center justify-center ${className}`}>
      <div className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-[var(--color-text-secondary)]">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--color-primary)]" />
        <span>{label}</span>
      </div>
    </div>
  );
}
