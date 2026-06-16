import React from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[var(--color-border-muted)]/70 motion-reduce:animate-none ${className}`}
    />
  );
}
