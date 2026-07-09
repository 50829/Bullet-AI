import type { OutboxItem } from "../types";
import { sanitizeRemotePayload } from "../payload";

export function sanitizePayload(payload: unknown) {
  return sanitizeRemotePayload(payload);
}

export function getClientId(payload: Record<string, unknown>) {
  return typeof payload.client_id === "string" && payload.client_id
    ? payload.client_id
    : null;
}

export function getPreviousImagePath(item: OutboxItem) {
  const value = (item.payload as Record<string, unknown>)?.previous_image_path;
  return typeof value === "string" && value ? value : null;
}

export function isDuplicateSuccess(
  error: { code?: string; message?: string } | null | undefined,
) {
  return (
    error?.code === "23505" ||
    Boolean(error?.message?.toLowerCase().includes("duplicate"))
  );
}
