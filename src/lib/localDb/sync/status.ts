import type { SyncStatus } from "../types";

let currentStatus: SyncStatus = "idle";
const listeners = new Set<(status: SyncStatus) => void>();

export function getSyncStatus() {
  return currentStatus;
}

export function subscribeSyncStatus(listener: (status: SyncStatus) => void) {
  listeners.add(listener);
  listener(currentStatus);
  return () => listeners.delete(listener);
}

export function setSyncStatus(status: SyncStatus) {
  currentStatus = status;
  listeners.forEach((listener) => listener(status));
}
