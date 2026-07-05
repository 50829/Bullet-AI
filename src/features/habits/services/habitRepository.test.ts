import { beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, toDateKey } from "../../../lib/date/dateUtils";

type Row = { id: number; client_id: string; [key: string]: unknown };

const memory = vi.hoisted(() => ({
  habits: [] as Row[],
  habit_checkins: [] as Row[],
}));

vi.mock("../../../lib/localDb/localFirstRepository", () => ({
  getLocalFirstRepository: (collection: "habits" | "habit_checkins") => ({
    list: async () => memory[collection],
    mutate: async (_userId: string, entity: Row) => {
      const index = memory[collection].findIndex(
        (row) => row.client_id === entity.client_id,
      );
      if (index >= 0) memory[collection][index] = entity;
      else memory[collection].push(entity);
      return entity;
    },
    remove: async (_userId: string, entity: Row) => {
      memory[collection] = memory[collection].filter(
        (row) => row.client_id !== entity.client_id,
      );
    },
    replaceRemote: async () => memory[collection],
  }),
}));

vi.mock("../../../lib/localDb/repository", () => ({
  createClientId: () => "habit-local-id",
  subscribeCollection: () => () => undefined,
}));

vi.mock("../../../lib/localDb/syncEngine", () => ({
  flushOutbox: vi.fn(async () => undefined),
}));
vi.mock("../../../lib/supabase/client", () => ({ supabase: {} }));

const repository = await import("./habitRepository");

describe("habit local-first repository", () => {
  beforeEach(() => {
    memory.habits = [];
    memory.habit_checkins = [];
  });

  it("creates a habit locally with a stable client id", async () => {
    const habit = await repository.createHabitLocal("user-1", {
      name: "阅读",
      frequency: "daily",
    });

    expect(habit).toMatchObject({
      client_id: "habit-local-id",
      user_id: "user-1",
      name: "阅读",
    });
    expect(memory.habits).toHaveLength(1);
  });

  it("uses a deterministic check-in identity for an offline habit", async () => {
    const habit = await repository.createHabitLocal("user-1", {
      name: "阅读",
      frequency: "daily",
    });
    const view = (await repository.readHabitViews("user-1"))[0];
    const today = toDateKey();

    await repository.setHabitCheckinLocal("user-1", view, today, true);
    await repository.setHabitCheckinLocal("user-1", view, today, false);

    expect(memory.habit_checkins).toHaveLength(1);
    expect(memory.habit_checkins[0]).toMatchObject({
      client_id: `habit-checkin:${habit.client_id}:${today}`,
      habit_client_id: habit.client_id,
      habit_id: null,
      checked: false,
    });
  });

  it("projects checked rows into count and daily streak", async () => {
    const now = new Date().toISOString();
    memory.habits.push({
      id: 1,
      client_id: "habit-1",
      user_id: "user-1",
      name: "阅读",
      description: null,
      frequency: "daily",
      color: null,
      created_at: addDays(toDateKey(), -10),
      updated_at: now,
    });
    for (const date of [toDateKey(), addDays(toDateKey(), -1)]) {
      memory.habit_checkins.push({
        id: memory.habit_checkins.length + 1,
        client_id: `habit-checkin:habit-1:${date}`,
        user_id: "user-1",
        habit_id: 1,
        habit_client_id: "habit-1",
        checked_on: date,
        checked: true,
        created_at: now,
        updated_at: now,
      });
    }

    expect(await repository.readHabitViews("user-1")).toEqual([
      expect.objectContaining({
        checkedToday: true,
        checkinCount: 2,
        streak: 2,
      }),
    ]);
  });
});
