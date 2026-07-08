export type WorkspacePage = "home" | "goals" | "moments" | "reflections";

export const WORKSPACE_HOME_PATH = "/home";

export const WORKSPACE_ROUTES: Record<WorkspacePage, string> = {
  home: WORKSPACE_HOME_PATH,
  goals: "/goals",
  moments: "/moments",
  reflections: "/reflections",
};

export const WORKSPACE_PAGE_ORDER: WorkspacePage[] = [
  "home",
  "goals",
  "moments",
  "reflections",
];

export function isWorkspacePath(pathname: string) {
  return Object.values(WORKSPACE_ROUTES).some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function getWorkspacePageFromPathname(pathname: string): WorkspacePage {
  const matched = Object.entries(WORKSPACE_ROUTES).find(
    ([, path]) => pathname === path || pathname.startsWith(`${path}/`),
  );
  return (matched?.[0] as WorkspacePage | undefined) ?? "home";
}

export function getWorkspacePath(page: WorkspacePage) {
  return WORKSPACE_ROUTES[page];
}
