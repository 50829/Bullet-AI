import type {
  HabitCheckinEntity,
  HabitEntity,
  HabitFrequency,
} from "../../domain/entities";

export type { HabitFrequency };
export type HabitRecord = HabitEntity;
export type HabitCheckin = HabitCheckinEntity;

export type HabitView = HabitRecord & {
  isCurrentPeriodComplete: boolean;
  currentPeriodCheckinId: string | null;
  checkinCount: number;
  lastCheckedOn: string | null;
  streak: number;
  streakUnit: "day" | "week";
  checkins: HabitCheckin[];
};

export type CreateHabitInput = {
  clientId?: string;
  name: string;
  description?: string;
  frequency: HabitFrequency;
  color?: string | null;
};

export type UpdateHabitInput = Partial<
  Pick<CreateHabitInput, "name" | "description" | "frequency" | "color">
>;
