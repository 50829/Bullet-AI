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
  const variantClasses = {
    primary: 'bg-[#003049] text-white border-2 border-[#003049] hover:bg-transparent hover:text-[#003049] hover:border-[#003049]',
    secondary: 'bg-white text-[#003049] border-2 border-[#003049] hover:bg-transparent hover:text-[#003049]',
    outline: 'bg-transparent text-[#003049] border-2 border-[#003049] hover:bg-[#003049] hover:text-white',
  };

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`}>
      {children}
    </button>
  );
};