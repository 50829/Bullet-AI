// src/components/ui/Tag.tsx
import React from 'react';

export const Tag = ({ children }: { children: React.ReactNode }) => {
  return (
    <span className="mr-2 inline-block rounded-full border border-[var(--color-border-muted)] bg-[var(--color-bg-primary)] px-2.5 py-1 text-sm font-medium text-[var(--color-text-secondary)]">
      {children}
    </span>
  );
};
