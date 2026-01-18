// src/components/ui/Textarea.tsx
import React from 'react';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = ({ className = '', ...props }: TextareaProps) => {
  return (
    <textarea
      className={`w-full px-4 py-2 bg-gradient-to-br from-blue-50/50 via-white/50 to-orange-50/50 border border-orange-200 rounded-3xl focus:outline-none focus:ring-2 focus:ring-orange-300 ${className}`}
      {...props}
    />
  );
};