"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Extra classes for the centered panel wrapper. */
  className?: string;
  /** Close when the backdrop is clicked. Defaults to true. */
  closeOnBackdrop?: boolean;
  /** Stacking layer. Defaults to 50; raise for nested dialogs. */
  z?: number;
  labelledBy?: string;
};

/**
 * Renders an overlay in a portal attached to <body>, so it escapes the
 * `position: fixed` stacking context created by <main> in MainLayout and can
 * actually dim the sidebar / top bar. Handles Escape, backdrop click, and
 * background scroll lock.
 */
export function Modal({
  isOpen,
  onClose,
  children,
  className = "",
  closeOnBackdrop = true,
  z = 50,
  labelledBy,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/40 p-4"
      style={{ zIndex: z }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className={`w-full ${className}`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
