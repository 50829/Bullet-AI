import { describe, expect, it } from "vitest";
import {
  buildRemoteInsertPayload,
  buildRemotePatchPayload,
} from "./payload-contracts";

const identity = { userId: "user-1", clientId: "client-1" };

describe("remote payload contracts", () => {
  it("maps profile insert and patch fields", () => {
    expect(
      buildRemoteInsertPayload("profiles", identity, {
        username: "",
        preferredLanguage: "zh",
        accentColor: "sage",
        colorScheme: "system",
        completedGoalRetention: "next_day",
        weekStartsOn: "monday",
      }),
    ).toStrictEqual({
      user_id: "user-1",
      username: null,
      preferred_language: "zh",
      accent_color: "sage",
      color_scheme: "system",
      completed_goal_retention: "next_day",
      week_starts_on: "monday",
    });

    expect(
      buildRemotePatchPayload("profiles", {
        username: "Mira",
        colorScheme: "dark",
      }),
    ).toStrictEqual({ username: "Mira", color_scheme: "dark" });
  });

  it("maps moment insert and patch fields", () => {
    expect(
      buildRemoteInsertPayload("moments", identity, {
        content: "A moment",
        occurredOn: "2026-07-01",
        imagePath: null,
      }),
    ).toStrictEqual({
      client_id: "client-1",
      user_id: "user-1",
      content: "A moment",
      occurred_on: "2026-07-01",
      image_path: null,
    });

    expect(
      buildRemotePatchPayload("moments", {
        occurredOn: "2026-07-02",
        imagePath: null,
      }),
    ).toStrictEqual({ occurred_on: "2026-07-02", image_path: null });
  });

  it("maps reflection insert and patch fields", () => {
    expect(
      buildRemoteInsertPayload("reflections", identity, {
        title: "Title",
        body: "Body",
      }),
    ).toStrictEqual({
      client_id: "client-1",
      user_id: "user-1",
      title: "Title",
      body: "Body",
    });

    expect(
      buildRemotePatchPayload("reflections", { body: "Updated body" }),
    ).toStrictEqual({ body: "Updated body" });
  });

  it("maps goal insert and patch fields without habit-only columns", () => {
    expect(
      buildRemoteInsertPayload("goals", identity, {
        title: "Goal",
        description: "Description",
        dueDate: null,
        completedAt: null,
        color: null,
        sortOrder: 0,
      }),
    ).toStrictEqual({
      client_id: "client-1",
      user_id: "user-1",
      title: "Goal",
      description: "Description",
      due_date: null,
      completed_at: null,
      color: null,
      sort_order: 0,
    });

    expect(
      buildRemotePatchPayload("goals", {
        completedAt: null,
        sortOrder: 0,
      }),
    ).toStrictEqual({ completed_at: null, sort_order: 0 });
  });

  it("preserves a habit's startedOn only in its insert payload", () => {
    expect(
      buildRemoteInsertPayload("habits", identity, {
        name: "Read",
        description: null,
        frequency: "daily",
        color: null,
        startedOn: "2026-06-28",
      }),
    ).toStrictEqual({
      client_id: "client-1",
      user_id: "user-1",
      name: "Read",
      description: null,
      frequency: "daily",
      color: null,
      started_on: "2026-06-28",
    });

    expect(buildRemotePatchPayload("habits", { color: null })).toStrictEqual({
      color: null,
    });

    if (false) {
      // @ts-expect-error startedOn is immutable after Habit creation.
      buildRemotePatchPayload("habits", { startedOn: "2026-06-29" });
    }
  });

  it("maps habit check-in inserts and rejects patches at compile time", () => {
    expect(
      buildRemoteInsertPayload("habit_checkins", identity, {
        habitClientId: "habit-1",
        checkedOn: "2026-07-10",
      }),
    ).toStrictEqual({
      client_id: "client-1",
      user_id: "user-1",
      habit_client_id: "habit-1",
      checked_on: "2026-07-10",
    });

    if (false) {
      // @ts-expect-error Habit check-ins use create/delete, never patch.
      buildRemotePatchPayload("habit_checkins", { checkedOn: "2026-07-11" });
    }
  });
});
