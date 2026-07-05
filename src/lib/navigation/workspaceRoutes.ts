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

const WORKSPACE_PATH_TO_PAGE = new Map(
  Object.entries(WORKSPACE_ROUTES).map(([page, path]) => [
    path,
    page as WorkspacePage,
  ]),
);

export function isWorkspacePath(pathname: string) {
  return WORKSPACE_PATH_TO_PAGE.has(pathname);
}

export function getWorkspacePageFromPathname(pathname: string): WorkspacePage {
  return WORKSPACE_PATH_TO_PAGE.get(pathname) ?? "home";
}

export function getWorkspacePath(page: WorkspacePage) {
  return WORKSPACE_ROUTES[page];
}
