import React from "react";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = ({ className = "", ...props }: TextareaProps) => {
  return (
    <textarea
      className={`w-full rounded-lg border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] transition-colors duration-150 placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15 motion-reduce:transition-none ${className}`}
      {...props}
    />
  );
};
