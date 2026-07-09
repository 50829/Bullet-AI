import type { LocalFirstEntity } from "../../lib/localFirst/types";

export type HabitFrequency = "daily" | "weekly";

export type HabitRecord = LocalFirstEntity & {
  name: string;
  description: string | null;
  frequency: HabitFrequency;
  color: string | null;
};

export type HabitCheckin = LocalFirstEntity & {
  user_id: string;
  habit_id: number | null;
  habit_client_id: string;
  checked_on: string;
  checked: boolean;
};

export type HabitView = HabitRecord & {
  checkedToday: boolean;
  todayCheckinId: number | null;
  checkinCount: number;
  lastCheckedOn: string | null;
  streak: number;
  checkins: HabitCheckin[];
};

export type CreateHabitInput = {
  client_id?: string;
  name: string;
  description?: string;
  frequency: HabitFrequency;
  color?: string | null;
};

export type UpdateHabitInput = Partial<
  Pick<CreateHabitInput, "name" | "description" | "frequency" | "color">
>;
