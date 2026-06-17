export type HabitFrequency = "daily" | "weekly";

export type HabitCheckin = {
  id: number;
  user_id: string;
  habit_id: number;
  checked_on: string;
  created_at: string;
};

export type HabitView = {
  id: number;
  client_id?: string;
  name: string;
  description: string | null;
  frequency: HabitFrequency;
  color: string | null;
  created_at: string;
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

export type UpdateHabitInput = Partial<Pick<CreateHabitInput, "name" | "description" | "frequency" | "color">>;
