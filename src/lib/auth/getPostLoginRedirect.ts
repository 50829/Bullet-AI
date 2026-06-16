const DEFAULT_POST_LOGIN_REDIRECT = "/dashboard";

export function getPostLoginRedirect(next?: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return DEFAULT_POST_LOGIN_REDIRECT;
  }

  return next;
}
