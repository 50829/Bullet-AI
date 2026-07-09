import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = ({ className = "", ...props }: InputProps) => {
  return (
    <input
      className={`w-full min-h-10 rounded-lg border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] transition-colors duration-150 placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15 motion-reduce:transition-none ${className}`}
      {...props}
    />
  );
};
