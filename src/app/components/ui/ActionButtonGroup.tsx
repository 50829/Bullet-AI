import React from "react";

type ActionButtonGroupProps = {
  children: React.ReactNode;
  className?: string;
};

export function ActionButtonGroup({
  children,
  className = "",
}: ActionButtonGroupProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>{children}</div>
  );
}
