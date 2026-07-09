import { flushOutbox } from "./lock";

export function installSyncTriggers() {
  if (typeof window === "undefined") return () => undefined;

  const flush = () => {
    if (document.visibilityState === "visible" || navigator.onLine)
      void flushOutbox();
  };

  window.addEventListener("online", flush);
  window.addEventListener("visibilitychange", flush);
  const interval = window.setInterval(flush, 30_000);
  flush();

  return () => {
    window.removeEventListener("online", flush);
    window.removeEventListener("visibilitychange", flush);
    window.clearInterval(interval);
  };
}
