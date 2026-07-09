import React from "react";

type FormActionsProps = {
  children: React.ReactNode;
  className?: string;
};

export function FormActions({ children, className = "" }: FormActionsProps) {
  return (
    <div className={`mt-6 flex justify-end gap-3 ${className}`}>{children}</div>
  );
}
