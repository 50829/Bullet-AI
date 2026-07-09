import React from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center px-4 py-8 text-center">
      <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
        {title}
      </h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--color-text-secondary)]">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
