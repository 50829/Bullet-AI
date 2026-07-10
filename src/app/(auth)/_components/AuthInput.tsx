import React from "react";

type AuthInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export function AuthInput({
  invalid = false,
  className = "",
  ...props
}: AuthInputProps) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border px-4 py-2 text-[var(--color-text-primary)] focus:outline-none focus:ring-2 ${
        invalid
          ? "border-red-500 focus:border-red-500 focus:ring-red-500"
          : "border-[var(--color-border-muted)] focus:ring-[var(--color-primary)]"
      } ${className}`}
    />
  );
}
