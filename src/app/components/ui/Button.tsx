// src/components/ui/Button.tsx
import React from 'react';

type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  disabled?: boolean;
};

export const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }: ButtonProps) => {
  const baseClasses = 'px-4 py-2 rounded-3xl font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center';
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--color-primary)',
          color: 'var(--color-text-on-primary)',
          borderColor: 'var(--color-primary)',
        };
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          color: 'var(--color-text-primary)',
          borderColor: 'var(--color-primary)',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: 'var(--color-text-primary)',
          borderColor: 'var(--color-primary)',
        };
      default:
        return {};
    }
  };

  const variantStyles = getVariantStyles();
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';

  // 移除className中的text-white，确保使用style中的颜色
  const cleanedClassName = className.replace(/\btext-white\b/g, '');
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`${baseClasses} border-2 ${disabledClasses} ${cleanedClassName}`}
      style={variantStyles}
      onMouseEnter={(e) => {
        if (!disabled && variant === 'primary') {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--color-text-primary)';
        } else if (!disabled && variant === 'secondary') {
          e.currentTarget.style.backgroundColor = 'transparent';
        } else if (!disabled && variant === 'outline') {
          e.currentTarget.style.backgroundColor = 'var(--color-primary)';
          e.currentTarget.style.color = 'var(--color-text-on-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          Object.assign(e.currentTarget.style, variantStyles);
        }
      }}
    >
      {children}
    </button>
  );
};