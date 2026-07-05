export type HabitFrequency = "daily" | "weekly";

export type HabitCheckin = {
  id: number;
  client_id: string;
  user_id: string;
  habit_id: number | null;
  habit_client_id: string;
  checked_on: string;
  checked: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  _local?: { pending?: boolean; failed?: boolean; deleted?: boolean };
};

export type HabitView = {
  id: number;
  client_id: string;
  user_id?: string;
  name: string;
  description: string | null;
  frequency: HabitFrequency;
  color: string | null;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  checkedToday: boolean;
  todayCheckinId: number | null;
  checkinCount: number;
  lastCheckedOn: string | null;
  streak: number;
  checkins: HabitCheckin[];
  _local?: { pending?: boolean; failed?: boolean; deleted?: boolean };
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
