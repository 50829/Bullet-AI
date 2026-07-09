import React from "react";
import { LoaderCircle } from "lucide-react";

type LoadingStateProps = {
  label?: string;
  delayed?: boolean;
  className?: string;
};

export function LoadingState({
  label = "Loading",
  delayed = false,
  className = "min-h-[220px]",
}: LoadingStateProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="rounded-2xl px-4 py-3" role="status" aria-label={label}>
        <LoaderCircle
          className={`size-9 animate-spin text-[var(--color-primary)] motion-reduce:animate-none ${
            delayed ? "loading-state-delayed" : ""
          }`}
          strokeWidth={2.25}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
