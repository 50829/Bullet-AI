import React from "react";

type OAuthButtonProps = {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
};

export function OAuthButton({
  icon,
  label,
  disabled = false,
  onClick,
}: OAuthButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mb-3 flex w-full items-center justify-center gap-3 rounded-lg border border-[var(--color-border-muted)] px-4 py-2.5 text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-primary)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {icon}
      {label}
    </button>
  );
}
