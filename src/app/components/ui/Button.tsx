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
  const baseClasses = 'px-4 py-2 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center';
  const variantClasses = {
    primary: 'bg-gray-800 text-white hover:bg-transparent hover:text-gray-800 hover:border-2 border-gray-800',
    secondary: 'bg-white text-gray-800 hover:bg-transparent hover:text-gray-800 hover:border-2 border-gray-800',
    outline: 'bg-transparent text-gray-800 border-2 border-gray-800 hover:bg-gray-800 hover:text-white',
  };

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`}>
      {children}
    </button>
  );
};