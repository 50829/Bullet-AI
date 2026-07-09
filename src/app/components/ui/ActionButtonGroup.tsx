import React from "react";

type ActionButtonGroupProps = {
  children: React.ReactNode;
  variant?: "inline" | "overlay";
  visibility?: "always" | "hover";
  surface?: "none" | "subtle";
  hoverScope?: "group" | "item";
  className?: string;
};

const variantClasses = {
  inline: "",
  overlay: "absolute right-3 top-3 z-10",
};

const surfaceClasses = {
  none: "",
  subtle: "rounded-lg bg-[var(--color-bg-surface)]/90 shadow-sm",
};

const hoverScopeClasses = {
  group: "group-hover:opacity-100",
  item: "group-hover/item:opacity-100",
};

export function ActionButtonGroup({
  children,
  variant = "inline",
  visibility = "always",
  surface = "none",
  hoverScope = "group",
  className = "",
}: ActionButtonGroupProps) {
  const visibilityClass =
    visibility === "hover"
      ? `opacity-100 transition-opacity duration-150 focus-within:opacity-100 sm:opacity-0 motion-reduce:transition-none ${hoverScopeClasses[hoverScope]}`
      : "";

  return (
    <div
      className={`flex items-center gap-1 ${variantClasses[variant]} ${surfaceClasses[surface]} ${visibilityClass} ${className}`}
    >
      {children}
    </div>
  );
}
