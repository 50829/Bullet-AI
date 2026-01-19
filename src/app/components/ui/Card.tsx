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
  // 如果 className 中包含 bg- 类，则不使用默认背景色
  // 使用正则表达式更精确地匹配 bg- 开头的类
  const hasCustomBg = /\bbg-[\w-[\]]+/.test(className) || style?.backgroundColor;
  const defaultBg = hasCustomBg ? '' : 'bg-[#efeeeb]';
  
  // 如果传入的 className 中包含 padding 或 rounded，则不使用默认值
  const hasCustomPadding = /\bp-\d+/.test(className);
  const defaultPadding = hasCustomPadding ? '' : 'p-6';
  const hasCustomRounded = /\brounded-/.test(className);
  const defaultRounded = hasCustomRounded ? '' : 'rounded-[28px]';
  
  // 确保传入的 className 在最后，这样它的类可以覆盖默认值
  return (
    <div className={`${defaultBg} ${defaultPadding} ${defaultRounded} ${className}`} style={style}>
      {children}
    </div>
  );
};