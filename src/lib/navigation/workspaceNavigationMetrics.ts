const START_MARK = "workspace-navigation-start";
const END_MARK = "workspace-navigation-end";
const MEASURE_NAME = "workspace-navigation";

let pendingPath: string | null = null;

function supportsPerformanceMarks() {
  return typeof performance !== "undefined" && typeof performance.mark === "function";
}

export function markWorkspaceNavigationStart(path: string) {
  if (!supportsPerformanceMarks()) return;

  pendingPath = path;
  performance.clearMarks(START_MARK);
  performance.clearMarks(END_MARK);
  performance.mark(START_MARK, { detail: { path } });
}

export function markWorkspaceNavigationComplete(path: string) {
  if (!supportsPerformanceMarks() || pendingPath !== path) return null;

  performance.mark(END_MARK, { detail: { path } });
  const measure = performance.measure(MEASURE_NAME, START_MARK, END_MARK);
  pendingPath = null;

  if (process.env.NODE_ENV === "development") {
    console.info(`[navigation] ${path}: ${measure.duration.toFixed(1)}ms`);
  }

  return measure.duration;
}
