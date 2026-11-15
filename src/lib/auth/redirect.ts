/**
 * Post-login redirect target. Only paths inside the dashboard are allowed, so
 * `?next=` can't be used as an open redirect (no "//evil.com", no schemes).
 */
export function safeAdminNext(next: string | null | undefined): string {
  if (
    next &&
    /^\/admin(\/[\w\-/?=&%.]*)?$/.test(next) &&
    !next.startsWith("/admin/login") &&
    !next.startsWith("/admin/logout") &&
    !next.includes("//")
  ) {
    return next;
  }
  return "/admin";
}
