import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";
import {
  getWorkspacePathFromLegacyPage,
  isWorkspacePath,
  WORKSPACE_HOME_PATH,
} from "./lib/navigation/workspaceRoutes";

const LOGIN_PATH = "/login";

function isProtectedPath(pathname: string) {
  return isWorkspacePath(pathname);
}

function isAuthPath(pathname: string) {
  return pathname === LOGIN_PATH || pathname === "/register";
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/dashboard" || pathname === "/main") {
    const url = request.nextUrl.clone();
    url.pathname = getWorkspacePathFromLegacyPage(url.searchParams.get("page"));
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (pathname === "/username") {
    const url = request.nextUrl.clone();
    url.pathname = WORKSPACE_HOME_PATH;
    url.search = "";
    return NextResponse.redirect(url);
  }

  const { response, user } = await updateSession(request);

  if (isProtectedPath(pathname) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (isAuthPath(pathname) && user) {
    const url = request.nextUrl.clone();
    url.pathname = WORKSPACE_HOME_PATH;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
