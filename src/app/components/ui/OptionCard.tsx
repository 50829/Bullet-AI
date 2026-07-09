import React from "react";
import { Check } from "lucide-react";

type OptionCardProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  selected: boolean;
  label: string;
  icon?: React.ReactNode;
  swatch?: string;
  children?: React.ReactNode;
};

export function OptionCard({
  selected,
  label,
  icon,
  swatch,
  children,
  className = "",
  type = "button",
  ...props
}: OptionCardProps) {
  return (
    <button
      {...props}
      type={type}
      className={`rounded-xl border p-4 text-left transition-colors duration-150 disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none ${
        selected
          ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]"
          : "border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-primary)]"
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
          {icon}
          {swatch && (
            <span
              className="h-6 w-6 shrink-0 rounded-full border border-black/10"
              style={{ backgroundColor: swatch }}
            />
          )}
          <span className="truncate">{label}</span>
        </span>
        {selected && (
          <Check size={16} className="shrink-0 text-[var(--color-primary)]" />
        )}
      </div>
      {children}
    </button>
  );
}

type OptionGridProps = {
  children: React.ReactNode;
  columns?: "two" | "three" | "four";
  className?: string;
};

const columnClasses = {
  two: "sm:grid-cols-2",
  three: "sm:grid-cols-3",
  four: "sm:grid-cols-4",
};

export function OptionGrid({
  children,
  columns = "three",
  className = "",
}: OptionGridProps) {
  return (
    <div
      className={`grid grid-cols-1 gap-3 ${columnClasses[columns]} ${className}`}
    >
      {children}
    </div>
  );
}
