import { performFlush } from "./runner";

let activeFlush: Promise<void> | null = null;

async function flushWithCrossTabLock() {
  if (typeof navigator !== "undefined" && navigator.locks) {
    await navigator.locks.request(
      "bullet-ai-outbox",
      { ifAvailable: true },
      async (lock) => {
        if (lock) await performFlush();
      },
    );
    return;
  }

  await performFlush();
}

export function flushOutbox() {
  if (activeFlush) return activeFlush;
  activeFlush = flushWithCrossTabLock().finally(() => {
    activeFlush = null;
  });
  return activeFlush;
}
