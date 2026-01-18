// src/components/ui/Card.tsx
import React from 'react';

export const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={`bg-[#efeeeb] p-6 rounded-[28px] ${className}`}>
      {children}
    </div>
  );
};