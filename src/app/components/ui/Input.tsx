// src/components/ui/Input.tsx
import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = ({ className = '', ...props }: InputProps) => {
  return (
    <input
      className={`w-full px-4 py-2 bg-gradient-to-br from-blue-50/50 via-white/50 to-orange-50/50 border border-[#003049] rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#003049] ${className}`}
      {...props}
    />
  );
};