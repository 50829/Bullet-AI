"use client";

import type { Language } from "../../../context/LanguageContext";
import { useLanguage } from "../../../context/LanguageContext";
import {
  resolveWeekStartsOn,
  type UserPreferences,
  type WeekStartsOnPreference,
} from "../../../../lib/profile/preferences";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { WEEK_START_OPTIONS } from "./settingsOptions";
import { OptionGroup, PreferenceOptionCard } from "./PreferenceOptionCard";

type LanguageSettingsSectionProps = {
  preferences: UserPreferences;
  savingPreference: keyof UserPreferences | null;
  onLanguageChange: (language: Language) => void;
  onWeekStartsOnChange: (
    weekStartsOn: Exclude<WeekStartsOnPreference, "auto">,
  ) => void;
};

const LANGUAGE_OPTIONS: Array<{ id: Language; label: string }> = [
  { id: "zh", label: "中文" },
  { id: "en", label: "English" },
];

export function LanguageSettingsSection({
  preferences,
  savingPreference,
  onLanguageChange,
  onWeekStartsOnChange,
}: LanguageSettingsSectionProps) {
  const { language } = useLanguage();

  return (
    <section className="max-w-2xl">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
        {language === "en" ? "Language" : "语言设置"}
      </h3>

      <SegmentedControl<Language>
        value={language}
        options={LANGUAGE_OPTIONS.map((option) => ({
          value: option.id,
          label: option.label,
        }))}
        onChange={onLanguageChange}
        disabled={savingPreference === "preferred_language"}
        className="mt-5"
      />

      <div className="mt-6">
        <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {language === "en" ? "Week starts on" : "一周起始日"}
        </h4>
        <OptionGroup className="mt-3" columns="three">
          {WEEK_START_OPTIONS.map((option) => (
            <PreferenceOptionCard
              key={option.id}
              selected={
                resolveWeekStartsOn(preferences.week_starts_on, language) ===
                option.weekStartValue
              }
              label={language === "en" ? option.labelEn : option.labelZh}
              onClick={() => onWeekStartsOnChange(option.id)}
              disabled={savingPreference === "week_starts_on"}
            />
          ))}
        </OptionGroup>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          {language === "en"
            ? "Default follows language: English starts on Sunday, Chinese starts on Monday."
            : "默认跟随语言：中文从周一开始，英文从周日开始。"}
        </p>
      </div>
    </section>
  );
}
