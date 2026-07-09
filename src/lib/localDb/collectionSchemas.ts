import type { LocalCollection } from "./types";

export type CollectionOrder = {
  column: string;
  ascending: boolean;
};

type CollectionIdentityColumn = "client_id" | "id" | "user_id";

type CollectionSchema = {
  columns: readonly string[];
  select: string;
  hasStorage: boolean;
  defaultOrder: CollectionOrder;
  identityColumn: CollectionIdentityColumn;
  conflictTarget: CollectionIdentityColumn;
  softDelete: boolean;
};

function defineCollectionSchema(
  schema: Omit<CollectionSchema, "select">,
): CollectionSchema {
  return {
    ...schema,
    select: schema.columns.join(","),
  };
}

const defaultLocalFirstConfig = {
  identityColumn: "client_id",
  conflictTarget: "client_id",
  softDelete: true,
} satisfies Pick<
  CollectionSchema,
  "identityColumn" | "conflictTarget" | "softDelete"
>;

const collectionSchemas: Record<LocalCollection, CollectionSchema> = {
  moments: defineCollectionSchema({
    columns: [
      "id",
      "client_id",
      "user_id",
      "content",
      "image_path",
      "created_at",
      "updated_at",
      "deleted_at",
    ],
    hasStorage: true,
    defaultOrder: { column: "created_at", ascending: false },
    ...defaultLocalFirstConfig,
  }),
  reflections: defineCollectionSchema({
    columns: [
      "id",
      "client_id",
      "user_id",
      "content",
      "title",
      "body",
      "source",
      "source_type",
      "location",
      "image_path",
      "created_at",
      "updated_at",
      "deleted_at",
    ],
    hasStorage: true,
    defaultOrder: { column: "created_at", ascending: false },
    ...defaultLocalFirstConfig,
  }),
  goals: defineCollectionSchema({
    columns: [
      "id",
      "client_id",
      "user_id",
      "title",
      "description",
      "status",
      "due_date",
      "progress",
      "color",
      "sort_order",
      "image_path",
      "created_at",
      "updated_at",
      "deleted_at",
    ],
    hasStorage: true,
    defaultOrder: { column: "created_at", ascending: false },
    ...defaultLocalFirstConfig,
  }),
  habits: defineCollectionSchema({
    columns: [
      "id",
      "client_id",
      "user_id",
      "name",
      "description",
      "frequency",
      "color",
      "created_at",
      "updated_at",
      "deleted_at",
    ],
    hasStorage: true,
    defaultOrder: { column: "created_at", ascending: false },
    ...defaultLocalFirstConfig,
  }),
  habit_checkins: defineCollectionSchema({
    columns: [
      "id",
      "client_id",
      "user_id",
      "habit_id",
      "habit_client_id",
      "checked_on",
      "checked",
      "created_at",
      "updated_at",
      "deleted_at",
    ],
    hasStorage: false,
    defaultOrder: { column: "checked_on", ascending: false },
    ...defaultLocalFirstConfig,
  }),
  profiles: defineCollectionSchema({
    columns: [
      "user_id",
      "username",
      "username_updated_at",
      "updated_at",
      "preferences_updated_at",
      "preferred_language",
      "ui_theme",
      "accent_color",
      "color_scheme",
      "completed_goal_retention",
      "week_starts_on",
    ],
    hasStorage: false,
    defaultOrder: { column: "updated_at", ascending: false },
    identityColumn: "user_id",
    conflictTarget: "user_id",
    softDelete: false,
  }),
};

function getCollectionSchema(collection: LocalCollection) {
  return collectionSchemas[collection];
}

export function selectColumnsFor(collection: LocalCollection) {
  return getCollectionSchema(collection).select;
}

export function hasStorageBucket(collection: LocalCollection) {
  return getCollectionSchema(collection).hasStorage;
}

export function defaultOrderFor(collection: LocalCollection) {
  return getCollectionSchema(collection).defaultOrder;
}

export function identityColumnFor(collection: LocalCollection) {
  return getCollectionSchema(collection).identityColumn;
}

export function conflictTargetFor(collection: LocalCollection) {
  return getCollectionSchema(collection).conflictTarget;
}

export function usesSoftDelete(collection: LocalCollection) {
  return getCollectionSchema(collection).softDelete;
}

export function identityValueFor(
  collection: LocalCollection,
  entity: Record<string, unknown>,
) {
  const column = identityColumnFor(collection);
  const value = entity[column];

  if (typeof value === "string" || typeof value === "number") {
    const identity = String(value);
    if (identity) return identity;
  }

  throw new Error(`Entity must include ${column}`);
}
