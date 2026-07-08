// src/components/ui/Card.tsx
import React from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  style?: React.CSSProperties;
};

export const Card = ({
  children,
  className = "",
  style,
  ...props
}: CardProps) => {
  const hasCustomBg = /\bbg-/.test(className) || style?.backgroundColor;
  const hasCustomPadding = /\bp-\d+/.test(className);
  const defaultPadding = hasCustomPadding ? "" : "p-4";
  const hasCustomRounded = /\brounded-/.test(className);
  const defaultRounded = hasCustomRounded ? "" : "rounded-xl";
  const mergedStyle: React.CSSProperties = {
    ...(hasCustomBg ? {} : { backgroundColor: "var(--color-bg-surface)" }),
    border: "1px solid var(--color-border-muted)",
    boxShadow: "var(--shadow-sm)",
    ...style,
  };

  return (
    <div
      {...props}
      className={`${defaultPadding} ${defaultRounded} ${className}`}
      style={mergedStyle}
    >
      {children}
    </div>
  );
};
