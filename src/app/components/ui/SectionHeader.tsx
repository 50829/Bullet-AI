import React from "react";

type SectionHeaderProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export function SectionHeader({
  title,
  description,
  action,
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
