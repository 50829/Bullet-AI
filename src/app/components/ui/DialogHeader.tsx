import React from "react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

type DialogHeaderProps = {
  title: React.ReactNode;
  onClose: () => void;
  closeLabel: string;
  className?: string;
};

export function DialogHeader({
  title,
  onClose,
  closeLabel,
  className = "",
}: DialogHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
        {title}
      </h2>
      <IconButton
        icon={<X size={20} />}
        label={closeLabel}
        onClick={onClose}
        tone="neutral"
      />
    </div>
  );
}
