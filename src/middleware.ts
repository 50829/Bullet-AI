import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";
import { isWorkspacePath } from "./lib/navigation/workspaceRoutes";

const LOGIN_PATH = "/login";
const SUPABASE_AUTH_COOKIE_PATTERN = /^sb-.+-auth-token(?:\.\d+)?$/;

function isProtectedPath(pathname: string) {
  return isWorkspacePath(pathname);
}

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some((cookie) => SUPABASE_AUTH_COOKIE_PATTERN.test(cookie.name));
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (!hasSupabaseAuthCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  const { response, user } = await updateSession(request);

  if (isProtectedPath(pathname) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/home/:path*",
    "/goals/:path*",
    "/moments/:path*",
    "/reflections/:path*",
  ],
};
