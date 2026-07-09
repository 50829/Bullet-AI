import React from "react";

type FieldLabelProps = {
  children: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
};

export function FieldLabel({
  children,
  meta,
  className = "",
}: FieldLabelProps) {
  return (
    <label
      className={`block text-sm font-medium text-[var(--color-text-primary)] ${className}`}
    >
      {children}
      {meta && (
        <span className="ml-2 text-xs font-normal text-[var(--color-text-secondary)]">
          {meta}
        </span>
      )}
    </label>
  );
}
