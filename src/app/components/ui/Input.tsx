// src/components/ui/Input.tsx
import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = ({ className = '', ...props }: InputProps) => {
  return (
    <input
      className={`w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${className}`}
      {...props}
    />
  );
};