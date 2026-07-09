import React from "react";

type AuthCardProps = {
  title: string;
  children: React.ReactNode;
};

export function AuthCard({ title, children }: AuthCardProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] px-4 py-8 text-[var(--color-text-primary)]">
      <div className="w-full max-w-md rounded-lg border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-8 text-center shadow-sm">
        <h1 className="mb-6 text-3xl font-bold text-[var(--color-text-primary)]">
          {title}
        </h1>
        {children}
      </div>
    </main>
  );
}
