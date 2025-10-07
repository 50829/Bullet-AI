// src/components/ui/Tag.tsx
import React from 'react';

export const Tag = ({ children }: { children: React.ReactNode }) => {
  return (
    <span className="inline-block bg-red-100 text-red-700 text-xs font-medium mr-2 px-2.5 py-1 rounded-full">
      {children}
    </span>
  );
};