export type DataResource =
  | "profiles"
  | "moments"
  | "reflections"
  | "goals"
  | "habits"
  | "habit_checkins";

export type SyncMetadata = {
  pending?: boolean;
  blocked?: boolean;
  conflict?: boolean;
};

export type VersionedEntity = {
  clientId: string;
  userId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  sync?: SyncMetadata;
};

export type PreferredLanguage = "zh" | "en";
export type AccentColor = "sage" | "green" | "purple" | "amber";
export type ColorScheme = "system" | "light" | "dark";
export type CompletedGoalRetention = "instant" | "next_day" | "never";
export type WeekStartsOnPreference = "auto" | "monday" | "sunday" | "saturday";

export type ProfileEntity = VersionedEntity & {
  username: string;
  preferredLanguage: PreferredLanguage;
  accentColor: AccentColor;
  colorScheme: ColorScheme;
  completedGoalRetention: CompletedGoalRetention;
  weekStartsOn: WeekStartsOnPreference;
};

export type MomentEntity = VersionedEntity & {
  content: string;
  occurredOn: string;
  imagePath: string | null;
};

export type ReflectionEntity = VersionedEntity & {
  title: string;
  body: string;
};

export type GoalEntity = VersionedEntity & {
  title: string;
  description: string;
  dueDate: string | null;
  completedAt: string | null;
  color: string | null;
  sortOrder: number;
};

export type HabitFrequency = "daily" | "weekly";

export type HabitEntity = VersionedEntity & {
  name: string;
  description: string | null;
  frequency: HabitFrequency;
  color: string | null;
  startedOn: string;
};

export type HabitCheckinEntity = VersionedEntity & {
  habitClientId: string;
  checkedOn: string;
};

export type EntityByResource = {
  profiles: ProfileEntity;
  moments: MomentEntity;
  reflections: ReflectionEntity;
  goals: GoalEntity;
  habits: HabitEntity;
  habit_checkins: HabitCheckinEntity;
};

export type WorkspaceEntity = EntityByResource[DataResource];
