import type { LocalCollection } from "./types";

export type CollectionOrder = {
  column: string;
  ascending: boolean;
};

type CollectionIdentityColumn = "client_id" | "id" | "user_id";
export type CollectionDeleteMode = "soft" | "none";
export type CascadeDeleteSpec = {
  collection: LocalCollection;
  foreignKey: string;
  sourceColumn: string;
};

export type CollectionAdapter = {
  collection: LocalCollection;
  columns: readonly string[];
  select: string;
  storageBucket: string | null;
  defaultOrder: CollectionOrder;
  identityColumn: CollectionIdentityColumn;
  conflictTarget: CollectionIdentityColumn;
  deleteMode: CollectionDeleteMode;
  canUseLocalFirstCollectionHook: boolean;
  cascadeDelete?: readonly CascadeDeleteSpec[];
};

function defineCollectionAdapter(
  adapter: Omit<CollectionAdapter, "select">,
): CollectionAdapter {
  return {
    ...adapter,
    select: adapter.columns.join(","),
  };
}

const defaultLocalFirstConfig = {
  identityColumn: "client_id",
  conflictTarget: "client_id",
  deleteMode: "soft",
  canUseLocalFirstCollectionHook: true,
} satisfies Pick<
  CollectionAdapter,
  | "identityColumn"
  | "conflictTarget"
  | "deleteMode"
  | "canUseLocalFirstCollectionHook"
>;

const collectionAdapters: Record<LocalCollection, CollectionAdapter> = {
  moments: defineCollectionAdapter({
    collection: "moments",
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
    storageBucket: "moments",
    defaultOrder: { column: "created_at", ascending: false },
    ...defaultLocalFirstConfig,
  }),
  reflections: defineCollectionAdapter({
    collection: "reflections",
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
    storageBucket: "reflections",
    defaultOrder: { column: "created_at", ascending: false },
    ...defaultLocalFirstConfig,
  }),
  goals: defineCollectionAdapter({
    collection: "goals",
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
    storageBucket: "goals",
    defaultOrder: { column: "created_at", ascending: false },
    ...defaultLocalFirstConfig,
  }),
  habits: defineCollectionAdapter({
    collection: "habits",
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
    storageBucket: null,
    defaultOrder: { column: "created_at", ascending: false },
    cascadeDelete: [
      {
        collection: "habit_checkins",
        foreignKey: "habit_client_id",
        sourceColumn: "client_id",
      },
    ],
    ...defaultLocalFirstConfig,
  }),
  habit_checkins: defineCollectionAdapter({
    collection: "habit_checkins",
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
    storageBucket: null,
    defaultOrder: { column: "checked_on", ascending: false },
    ...defaultLocalFirstConfig,
  }),
  profiles: defineCollectionAdapter({
    collection: "profiles",
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
    storageBucket: null,
    defaultOrder: { column: "updated_at", ascending: false },
    identityColumn: "user_id",
    conflictTarget: "user_id",
    deleteMode: "none",
    canUseLocalFirstCollectionHook: false,
  }),
};

export function getCollectionAdapter(collection: LocalCollection) {
  return collectionAdapters[collection];
}

export function selectColumnsFor(collection: LocalCollection) {
  return getCollectionAdapter(collection).select;
}

export function hasStorageBucket(collection: LocalCollection) {
  return Boolean(getCollectionAdapter(collection).storageBucket);
}

export function storageBucketFor(collection: LocalCollection) {
  return getCollectionAdapter(collection).storageBucket;
}

export function defaultOrderFor(collection: LocalCollection) {
  return getCollectionAdapter(collection).defaultOrder;
}

export function identityColumnFor(collection: LocalCollection) {
  return getCollectionAdapter(collection).identityColumn;
}

export function conflictTargetFor(collection: LocalCollection) {
  return getCollectionAdapter(collection).conflictTarget;
}

export function usesSoftDelete(collection: LocalCollection) {
  return getCollectionAdapter(collection).deleteMode === "soft";
}

export function canUseLocalFirstCollectionHook(collection: LocalCollection) {
  return getCollectionAdapter(collection).canUseLocalFirstCollectionHook;
}

export function buildDeletePayload(
  collection: LocalCollection,
  payload: Record<string, unknown>,
  deletedAt: string,
) {
  if (!usesSoftDelete(collection)) {
    throw new Error(`${collection} does not support local-first delete`);
  }
  void payload;
  return { deleted_at: deletedAt };
}

export function buildUpdatePayload(payload: Record<string, unknown>) {
  const updates = { ...payload };
  delete updates.id;
  delete updates.user_id;
  return updates;
}

export function buildUpsertPayload(
  collection: LocalCollection,
  payload: Record<string, unknown>,
) {
  const upsertPayload = { ...payload };
  if (identityColumnFor(collection) === "client_id") delete upsertPayload.id;
  return upsertPayload;
}

export function cascadeDeletesFor(
  collection: LocalCollection,
  payload: Record<string, unknown>,
) {
  return (getCollectionAdapter(collection).cascadeDelete ?? []).flatMap(
    (spec) => {
      const value = payload[spec.sourceColumn];
      if (typeof value !== "string" && typeof value !== "number") return [];
      return [{ ...spec, value }];
    },
  );
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
