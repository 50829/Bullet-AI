import { WORKSPACE_ROUTES } from "./workspaceRoutes";

export const WORKSPACE_PREFETCH_DELAY_MS = 700;

const PREFETCH_PRIORITY = [
  WORKSPACE_ROUTES.goals,
  WORKSPACE_ROUTES.moments,
  WORKSPACE_ROUTES.reflections,
  WORKSPACE_ROUTES.home,
];

export type NetworkConnectionHint = {
  saveData?: boolean;
  effectiveType?: string;
};

export function shouldSkipWorkspacePrefetch(connection?: NetworkConnectionHint) {
  return connection?.saveData === true || connection?.effectiveType === "2g";
}

export function getWorkspacePrefetchTargets(currentPath: string) {
  return PREFETCH_PRIORITY.filter((path) => path !== currentPath);
}
