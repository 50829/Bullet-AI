"use client";

import {
  Download,
  Languages,
  Palette,
  User,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "@/shared/i18n/LanguageContext";
import type { SettingsSection } from "./types";

type SettingsSidebarProps = {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
};

type SidebarItem = {
  section: SettingsSection;
  Icon: LucideIcon;
  label: string;
};

export function SettingsSidebar({
  activeSection,
  onSectionChange,
}: SettingsSidebarProps) {
  const { t, language } = useLanguage();
  const items: SidebarItem[] = [
    { section: "user", Icon: User, label: t("user") },
    { section: "appearance", Icon: Palette, label: t("appearance") },
    {
      section: "language",
      Icon: Languages,
      label: language === "en" ? "Language" : "语言",
    },
    {
      section: "data",
      Icon: Download,
      label: language === "en" ? "Data" : "数据",
    },
  ];

  return (
    <aside className="border-b border-[var(--color-border-muted)] p-3 md:w-64 md:border-b-0 md:border-r">
      <nav className="grid grid-cols-4 gap-2 md:grid-cols-1">
        {items.map(({ section, Icon, label }) => {
          const isActive = activeSection === section;
          return (
            <button
              key={section}
              type="button"
              onClick={() => onSectionChange(section)}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-colors duration-150 motion-reduce:transition-none ${
                isActive
                  ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
