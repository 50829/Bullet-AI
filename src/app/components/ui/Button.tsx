// src/components/ui/Button.tsx
import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
};

const variantClasses = {
  primary:
    "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-text-on-primary)] hover:bg-[var(--color-primary-hover)]",
  secondary:
    "border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-primary)]",
  outline:
    "border-[var(--color-border)] bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-bg-primary)]",
  ghost:
    "border-transparent bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-bg-primary)]",
  danger:
    "border-red-600 bg-red-600 text-white hover:bg-red-700",
};

export const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  className = '',
  disabled = false,
  ...props
}: ButtonProps) => {
  const baseClasses =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none";

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
