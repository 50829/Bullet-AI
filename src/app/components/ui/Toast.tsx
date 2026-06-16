"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  type: ToastType;
  title?: string;
  message: string;
};

type ToastInput = Omit<Toast, "id">;

type ToastContextType = {
  showToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

const iconByType = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const toneByType = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-slate-200 bg-white text-slate-900",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: ToastInput) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { ...toast, id }].slice(-4));
    window.setTimeout(() => removeToast(id), toast.type === "error" ? 5200 : 3600);
  }, [removeToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[80] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-6 sm:top-6">
        {toasts.map((toast) => {
          const Icon = iconByType[toast.type];

          return (
            <div
              key={toast.id}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-sm transition motion-reduce:transition-none ${toneByType[toast.type]}`}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                {toast.title && <p className="text-sm font-semibold">{toast.title}</p>}
                <p className="text-sm leading-5">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="rounded-md p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100 motion-reduce:transition-none"
                aria-label="Close notification"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
