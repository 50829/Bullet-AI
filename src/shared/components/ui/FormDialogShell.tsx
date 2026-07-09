"use client";

import React, { type FormEventHandler } from "react";
import { DialogHeader } from "./DialogHeader";
import { Modal } from "./Modal";

type FormDialogShellProps = {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  closeLabel: string;
  children: React.ReactNode;
  modalClassName?: string;
  panelClassName?: string;
  headerClassName?: string;
  onSubmit?: FormEventHandler<HTMLFormElement>;
};

export function FormDialogShell({
  isOpen,
  onClose,
  title,
  closeLabel,
  children,
  modalClassName = "max-w-md",
  panelClassName = "w-full rounded-2xl bg-[var(--color-bg-surface)] p-6 shadow-xl",
  headerClassName = "",
  onSubmit,
}: FormDialogShellProps) {
  const header = (
    <DialogHeader
      title={title}
      onClose={onClose}
      closeLabel={closeLabel}
      className={headerClassName}
    />
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} className={modalClassName}>
      {onSubmit ? (
        <form onSubmit={onSubmit} className={panelClassName}>
          {header}
          {children}
        </form>
      ) : (
        <div className={panelClassName}>
          {header}
          {children}
        </div>
      )}
    </Modal>
  );
}
