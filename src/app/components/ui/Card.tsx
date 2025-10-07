// src/components/ui/Card.tsx
import React from 'react';

export const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={`bg-white p-6 rounded-xl border border-gray-100 ${className}`}>
      {children}
    </div>
  );
};