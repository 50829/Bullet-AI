import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

const DASHBOARD_PATH = "/dashboard";
const LOGIN_PATH = "/login";
const LEGACY_REDIRECTS: Record<string, string> = {
  "/goals": "/dashboard?page=goals",
  "/moments": "/dashboard?page=moments",
  "/reflections": "/dashboard?page=reflections",
  "/username": DASHBOARD_PATH,
};

function isProtectedPath(pathname: string) {
  return pathname === DASHBOARD_PATH || pathname.startsWith(`${DASHBOARD_PATH}/`);
}

function isAuthPath(pathname: string) {
  return pathname === LOGIN_PATH || pathname === "/register";
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/main" || pathname.startsWith("/main/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/main/, DASHBOARD_PATH);
    return NextResponse.redirect(url);
  }

  const legacyRedirect = LEGACY_REDIRECTS[pathname];
  if (legacyRedirect) {
    return NextResponse.redirect(new URL(legacyRedirect, request.url));
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
    url.pathname = DASHBOARD_PATH;
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
