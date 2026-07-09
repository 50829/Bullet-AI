import type { LocalCollection } from "./types";

export const LOCAL_COLLECTION_SELECT: Record<LocalCollection, string> = {
  moments:
    "id,client_id,user_id,content,image_path,created_at,updated_at,deleted_at",
  reflections:
    "id,client_id,user_id,content,title,body,source,source_type,location,image_path,created_at,updated_at,deleted_at",
  goals:
    "id,client_id,user_id,title,description,status,due_date,progress,color,sort_order,image_path,created_at,updated_at,deleted_at",
  habits:
    "id,client_id,user_id,name,description,frequency,color,created_at,updated_at,deleted_at",
  habit_checkins:
    "id,client_id,user_id,habit_id,habit_client_id,checked_on,checked,created_at,updated_at,deleted_at",
  profiles:
    "user_id,username,username_updated_at,updated_at,preferences_updated_at,preferred_language,ui_theme,accent_color,color_scheme,completed_goal_retention,week_starts_on",
};

const STORAGE_COLLECTIONS = new Set<LocalCollection>([
  "moments",
  "reflections",
  "goals",
  "habits",
]);

export function selectColumnsFor(collection: LocalCollection) {
  return LOCAL_COLLECTION_SELECT[collection];
}

export function hasStorageBucket(collection: LocalCollection) {
  return STORAGE_COLLECTIONS.has(collection);
}
