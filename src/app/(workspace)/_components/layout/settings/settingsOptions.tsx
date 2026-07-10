import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import type {
  AccentColor,
  ColorScheme,
  CompletedGoalRetention,
  WeekStartsOnPreference,
} from "@/lib/profile/preferences";

export const ACCENT_OPTIONS: Array<{
  id: AccentColor;
  labelZh: string;
  labelEn: string;
  color: string;
}> = [
  { id: "sage", labelZh: "鼠尾草", labelEn: "Sage", color: "#2f6f5e" },
  { id: "green", labelZh: "森林绿", labelEn: "Forest", color: "#2f7d52" },
  { id: "purple", labelZh: "雾紫", labelEn: "Mauve", color: "#7c5c9e" },
  { id: "amber", labelZh: "琥珀", labelEn: "Amber", color: "#b45309" },
];

export const COLOR_SCHEME_OPTIONS: Array<{
  id: ColorScheme;
  labelZh: string;
  labelEn: string;
  Icon: LucideIcon;
}> = [
  { id: "system", labelZh: "跟随系统", labelEn: "System", Icon: Monitor },
  { id: "light", labelZh: "浅色", labelEn: "Light", Icon: Sun },
  { id: "dark", labelZh: "深色", labelEn: "Dark", Icon: Moon },
];

export const COMPLETED_GOAL_RETENTION_OPTIONS: Array<{
  id: CompletedGoalRetention;
  labelZh: string;
  labelEn: string;
}> = [
  { id: "instant", labelZh: "立即归档", labelEn: "Archive now" },
  { id: "next_day", labelZh: "次日归档", labelEn: "Archive tomorrow" },
  { id: "never", labelZh: "保留", labelEn: "Keep" },
];

export const WEEK_START_OPTIONS: Array<{
  id: Exclude<WeekStartsOnPreference, "auto">;
  weekStartValue: 0 | 1 | 6;
  labelZh: string;
  labelEn: string;
}> = [
  { id: "monday", weekStartValue: 1, labelZh: "周一", labelEn: "Monday" },
  { id: "sunday", weekStartValue: 0, labelZh: "周日", labelEn: "Sunday" },
  { id: "saturday", weekStartValue: 6, labelZh: "周六", labelEn: "Saturday" },
];
