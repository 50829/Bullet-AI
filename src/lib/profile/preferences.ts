export type PreferredLanguage = "zh" | "en";
export type UiTheme = "calm";
export type AccentColor = "sage" | "green" | "purple" | "amber";
export type ColorScheme = "system" | "light" | "dark";
export type CompletedGoalRetention = "instant" | "next_day" | "never";

export type UserPreferences = {
  preferred_language: PreferredLanguage;
  ui_theme: UiTheme;
  accent_color: AccentColor;
  color_scheme: ColorScheme;
  completed_goal_retention: CompletedGoalRetention;
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  preferred_language: "zh",
  ui_theme: "calm",
  accent_color: "sage",
  color_scheme: "system",
  completed_goal_retention: "next_day",
};

export const LANGUAGE_STORAGE_KEY = "language";
export const UI_THEME_STORAGE_KEY = "ui-theme";
export const ACCENT_COLOR_STORAGE_KEY = "accent-color";
export const COLOR_SCHEME_STORAGE_KEY = "color-scheme";
export const COMPLETED_GOAL_RETENTION_STORAGE_KEY = "completed-goal-retention";

export function normalizeLanguage(value: unknown): PreferredLanguage {
  return value === "en" ? "en" : "zh";
}

export function normalizeUiTheme(value?: unknown): UiTheme {
  void value;
  return "calm";
}

export function normalizeAccentColor(value: unknown): AccentColor {
  if (value === "green" || value === "purple" || value === "amber" || value === "sage") {
    return value;
  }

  return "sage";
}

export function normalizeColorScheme(value: unknown): ColorScheme {
  if (value === "light" || value === "dark" || value === "system") return value;
  return "system";
}

export function normalizeCompletedGoalRetention(value: unknown): CompletedGoalRetention {
  if (value === "instant" || value === "next_day" || value === "never") return value;
  return "next_day";
}

export function normalizePreferences(
  value: Partial<Record<keyof UserPreferences, unknown>> | null | undefined,
): UserPreferences {
  return {
    preferred_language: normalizeLanguage(value?.preferred_language),
    ui_theme: normalizeUiTheme(value?.ui_theme),
    accent_color: normalizeAccentColor(value?.accent_color),
    color_scheme: normalizeColorScheme(value?.color_scheme),
    completed_goal_retention: normalizeCompletedGoalRetention(value?.completed_goal_retention),
  };
}

export function resolveColorScheme(colorScheme: ColorScheme): "light" | "dark" {
  if (colorScheme === "light" || colorScheme === "dark") return colorScheme;
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function applyAppearancePreference(
  preferences: Pick<UserPreferences, "ui_theme" | "accent_color" | "color_scheme">,
) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const colorPreference = normalizeColorScheme(preferences.color_scheme);
  const resolvedColorScheme = resolveColorScheme(colorPreference);

  root.className = root.className
    .split(" ")
    .filter((className) => !className.startsWith("theme-"))
    .join(" ")
    .trim();
  root.dataset.uiTheme = normalizeUiTheme(preferences.ui_theme);
  root.dataset.accent = normalizeAccentColor(preferences.accent_color);
  root.dataset.colorPreference = colorPreference;
  root.dataset.colorScheme = resolvedColorScheme;
  root.style.colorScheme = resolvedColorScheme;
}

export function readLocalPreferences(): UserPreferences {
  if (typeof window === "undefined") return DEFAULT_USER_PREFERENCES;

  return normalizePreferences({
    preferred_language: window.localStorage.getItem(LANGUAGE_STORAGE_KEY),
    ui_theme: window.localStorage.getItem(UI_THEME_STORAGE_KEY),
    accent_color: window.localStorage.getItem(ACCENT_COLOR_STORAGE_KEY),
    color_scheme: window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY),
    completed_goal_retention: window.localStorage.getItem(COMPLETED_GOAL_RETENTION_STORAGE_KEY),
  });
}

export function writeLocalPreferences(preferences: Partial<UserPreferences>) {
  if (typeof window === "undefined") return;

  const current = readLocalPreferences();
  const next = normalizePreferences({ ...current, ...preferences });

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next.preferred_language);
  window.localStorage.setItem(UI_THEME_STORAGE_KEY, next.ui_theme);
  window.localStorage.setItem(ACCENT_COLOR_STORAGE_KEY, next.accent_color);
  window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, next.color_scheme);
  window.localStorage.setItem(COMPLETED_GOAL_RETENTION_STORAGE_KEY, next.completed_goal_retention);
  document.documentElement.lang = next.preferred_language;
  applyAppearancePreference(next);

  window.dispatchEvent(
    new CustomEvent("preferences-updated", {
      detail: { preferences: next },
    }),
  );
}
