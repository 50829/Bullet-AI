export const LOCAL_VIEW_FIELDS = ["_local", "date", "image_url"] as const;

export const LOCAL_FILE_FIELDS = [
  "local_file",
  "local_file_id",
  "local_file_name",
  "uploaded_image_path",
  "previous_image_path",
] as const;

export const TRANSIENT_ENTITY_FIELDS = [
  ...LOCAL_VIEW_FIELDS,
  ...LOCAL_FILE_FIELDS,
] as const;

export function stripPayloadFields<T>(
  payload: T,
  fields: readonly string[],
) {
  if (!payload || typeof payload !== "object") return payload;

  const next = { ...(payload as Record<string, unknown>) };
  fields.forEach((field) => {
    delete next[field];
  });
  return next as T;
}

export function stripLocalViewFields<T>(payload: T) {
  return stripPayloadFields(payload, LOCAL_VIEW_FIELDS);
}

export function stripTransientEntityFields<T>(payload: T) {
  return stripPayloadFields(payload, TRANSIENT_ENTITY_FIELDS);
}

export function sanitizeRemotePayload<T>(payload: T) {
  return stripTransientEntityFields(payload);
}
