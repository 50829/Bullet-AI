"use client";

import { X } from "lucide-react";
import React from "react";
import { useLanguage } from "@/shared/i18n/LanguageContext";
import { IconButton } from "@/shared/components/ui/IconButton";
import { SettingsSidebar } from "./SettingsSidebar";
import type { SettingsSection } from "./types";

type SettingsPanelShellProps = {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  onClose: () => void;
  children: React.ReactNode;
};

export function SettingsPanelShell({
  activeSection,
  onSectionChange,
  onClose,
  children,
}: SettingsPanelShellProps) {
  const { t } = useLanguage();

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-900/35 transition-opacity duration-200 motion-reduce:transition-none"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="flex h-[82vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] shadow-xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[var(--color-border-muted)] px-5 py-4">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              {t("settings")}
            </h2>
            <IconButton
              icon={<X size={22} />}
              label={t("close")}
              onClick={onClose}
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <SettingsSidebar
              activeSection={activeSection}
              onSectionChange={onSectionChange}
            />
            <main className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
