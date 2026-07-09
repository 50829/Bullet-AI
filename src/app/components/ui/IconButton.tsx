import React from "react";

type IconButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "aria-label"
> & {
  icon: React.ReactNode;
  label: string;
  tone?: "neutral" | "primary" | "danger";
  size?: "sm" | "md" | "lg";
  stopPropagation?: boolean;
};

const toneClasses = {
  neutral:
    "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-text-primary)] focus-visible:ring-[var(--color-primary)]/30",
  primary:
    "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-primary)] focus-visible:ring-[var(--color-primary)]/30",
  danger:
    "text-[var(--color-text-secondary)] hover:bg-red-50 hover:text-red-600 focus-visible:ring-red-500/30",
};

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-11 w-11",
};

export function IconButton({
  icon,
  label,
  tone = "neutral",
  size = "md",
  stopPropagation = false,
  type = "button",
  className = "",
  onClick,
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      type={type}
      title={label}
      aria-label={label}
      onClick={(event) => {
        if (stopPropagation) event.stopPropagation();
        onClick?.(event);
      }}
      className={`inline-flex items-center justify-center rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${sizeClasses[size]} ${toneClasses[tone]} ${className}`}
    >
      {icon}
    </button>
  );
}
