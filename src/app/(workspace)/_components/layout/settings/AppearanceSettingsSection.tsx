"use client";

import type {
  AccentColor,
  ColorScheme,
  UserPreferences,
} from "@/lib/profile/preferences";
import { ColorSwatchPicker } from "@/shared/components/ui/ColorSwatchPicker";
import { useLanguage } from "@/shared/i18n/LanguageContext";
import { ACCENT_OPTIONS, COLOR_SCHEME_OPTIONS } from "./settingsOptions";
import { OptionGroup, PreferenceOptionCard } from "./PreferenceOptionCard";

type AppearanceSettingsSectionProps = {
  preferences: UserPreferences;
  savingPreference: keyof UserPreferences | null;
  onColorSchemeChange: (colorScheme: ColorScheme) => void;
  onAccentChange: (accentColor: AccentColor) => void;
};

export function AppearanceSettingsSection({
  preferences,
  savingPreference,
  onColorSchemeChange,
  onAccentChange,
}: AppearanceSettingsSectionProps) {
  const { t, language } = useLanguage();

  return (
    <section className="max-w-3xl">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
        {t("appearance")}
      </h3>

      <div className="mt-5">
        <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {t("colorMode")}
        </h4>
        <OptionGroup className="mt-3" columns="three">
          {COLOR_SCHEME_OPTIONS.map((option) => {
            const selected = preferences.color_scheme === option.id;
            const Icon = option.Icon;
            return (
              <PreferenceOptionCard
                key={option.id}
                selected={selected}
                label={language === "en" ? option.labelEn : option.labelZh}
                icon={<Icon size={16} />}
                onClick={() => onColorSchemeChange(option.id)}
                disabled={savingPreference === "color_scheme"}
              />
            );
          })}
        </OptionGroup>
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {t("accentColor")}
        </h4>
        <ColorSwatchPicker
          value={preferences.accent_color}
          options={ACCENT_OPTIONS.map((option) => ({
            value: option.id,
            swatch: option.color,
            label: language === "en" ? option.labelEn : option.labelZh,
          }))}
          onChange={onAccentChange}
          disabled={savingPreference === "accent_color"}
          className="mt-3"
        />
      </div>
    </section>
  );
}
