import React from "react";
import { Card } from "./Card";
import { SectionHeader } from "./SectionHeader";

type DashboardCardSectionProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function DashboardCardSection({
  title,
  description,
  action,
  children,
  className = "",
}: DashboardCardSectionProps) {
  return (
    <Card className={className}>
      <SectionHeader
        title={title}
        description={description}
        action={action}
        className="mb-4"
      />
      {children}
    </Card>
  );
}
