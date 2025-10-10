// src/components/ui/Tag.tsx
import React from 'react';

export const Tag = ({ children }: { children: React.ReactNode }) => {
  return (
    <span className="inline-block bg-gradient-to-br from-blue-100/80 via-white/80 to-orange-100/80 text-gray-700 text-sm font-medium mr-2 px-2.5 py-1 rounded-full border border-orange-200">
      {children}
    </span>
  );
};