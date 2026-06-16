// src/components/ui/Card.tsx
import React from 'react';

export const Card = ({ 
  children, 
  className = '', 
  style 
}: { 
  children: React.ReactNode; 
  className?: string;
  style?: React.CSSProperties;
}) => {
  const hasCustomBg = /\bbg-/.test(className) || style?.backgroundColor;
  const hasCustomPadding = /\bp-\d+/.test(className);
  const defaultPadding = hasCustomPadding ? '' : 'p-4';
  const hasCustomRounded = /\brounded-/.test(className);
  const defaultRounded = hasCustomRounded ? '' : 'rounded-xl';
  const mergedStyle: React.CSSProperties = {
    ...(hasCustomBg ? {} : { backgroundColor: 'var(--color-bg-surface)' }),
    border: '1px solid var(--color-border-muted)',
    boxShadow: 'var(--shadow-sm)',
    ...style,
  };

  return (
    <div className={`${defaultPadding} ${defaultRounded} ${className}`} style={mergedStyle}>
      {children}
    </div>
  );
};
