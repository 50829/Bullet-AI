// src/components/ui/Textarea.tsx
import React from 'react';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = ({ className = '', ...props }: TextareaProps) => {
  return (
    <textarea
      className={`w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${className}`}
      {...props}
    />
  );
};