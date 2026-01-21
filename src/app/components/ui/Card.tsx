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
  
  // 如果传入的 className 中包含 padding 或 rounded，则不使用默认值
  const hasCustomPadding = /\bp-\d+/.test(className);
  const defaultPadding = hasCustomPadding ? '' : 'p-6';
  const hasCustomRounded = /\brounded-/.test(className);
  const defaultRounded = hasCustomRounded ? '' : 'rounded-[28px]';
  
  // 合并样式，使用 CSS 变量作为默认背景，并添加毛玻璃效果
  // 为了增强毛玻璃效果，将背景色设置为半透明
  const mergedStyle: React.CSSProperties = {
    ...(hasCustomBg ? {} : { 
      backgroundColor: 'var(--color-bg-card)',
      opacity: 0.85, // 增加透明度以提升毛玻璃效果
    }),
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    border: '1px solid rgba(255, 255, 255, 0.55)',
    boxShadow: '0 18px 45px rgba(0, 0, 0, 0.08)',
    ...style,
  };
  
  // 确保传入的 className 在最后，这样它的类可以覆盖默认值
  return (
    <div className={`${defaultPadding} ${defaultRounded} ${className}`} style={mergedStyle}>
      {children}
    </div>
  );
};