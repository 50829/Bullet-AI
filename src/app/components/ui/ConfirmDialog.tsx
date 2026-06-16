"use client";

import React from "react";
import { Button } from "./Button";

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  loading?: boolean;
  tone?: "danger" | "default";
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  loading = false,
  tone = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h2>
        {description && (
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{description}</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            variant={tone === "danger" ? "danger" : "primary"}
          >
            {loading ? "..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
