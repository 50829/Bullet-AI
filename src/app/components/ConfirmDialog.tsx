// src/components/ConfirmDialog.tsx
import { FC, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  title: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;   // 外部传入
  cancelText?: string;    // 外部传入
}

export const ConfirmDialog: FC<Props> = ({
  open,
  title,
  onConfirm,
  onCancel,
  confirmText = 'Delete',   // 默认英文
  cancelText = 'Cancel',
}) => {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />
      <div className="relative bg-[#E5E5E5] rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};