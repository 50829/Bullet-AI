"use client";

import React from "react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

type DrawerProps = {
  isOpen: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function Drawer({ isOpen, title, onClose, children }: DrawerProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 motion-reduce:transition-none ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] shadow-xl transition-transform duration-200 motion-reduce:transition-none sm:max-w-[460px] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(event) => event.stopPropagation()}
        aria-hidden={!isOpen}
      >
        <div className="flex min-h-16 items-center justify-between border-b border-[var(--color-border-muted)] px-4">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            {title}
          </h2>
          <IconButton
            icon={<X size={20} />}
            label="Close drawer"
            onClick={onClose}
          />
        </div>
        {children}
      </aside>
    </>
  );
}
