import {
  getWorkspacePathFromLegacyPage,
  isWorkspacePath,
  WORKSPACE_HOME_PATH,
} from "../navigation/workspaceRoutes";

export function getPostLoginRedirect(next?: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return WORKSPACE_HOME_PATH;
  }

  const url = new URL(next, "https://bullet.local");

  if (url.pathname === "/dashboard" || url.pathname === "/main") {
    return getWorkspacePathFromLegacyPage(url.searchParams.get("page"));
  }

  if (url.pathname === "/username") {
    return WORKSPACE_HOME_PATH;
  }

  if (isWorkspacePath(url.pathname)) {
    return `${url.pathname}${url.search}`;
  }

  return WORKSPACE_HOME_PATH;
}
