"use client";

/**
 * Thin client-side fetch wrapper for our JSON API. Throws an Error carrying the
 * server's user-facing message so components can show it directly.
 *
 * A 401 means the session is gone — expired, or (single-device enforcement,
 * §15.1) invalidated because the account logged in on another device. The Edge
 * middleware can't catch this: it only checks the JWT is structurally valid and
 * never touches the DB, so a session killed server-side still renders the shell,
 * and the next fetch is the first place we learn it's dead. So we handle it here
 * — bounce straight to the login screen instead of leaving the page spinning.
 */
function handleUnauthorized(): void {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  // Already on a login screen — let that page show its own inline error.
  if (path === "/login" || path === "/console/login") return;
  const target = path.startsWith("/console") ? "/console/login" : "/login";
  window.location.assign(target);
}

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    throw new Error((data as { error?: string }).error ?? "Something went wrong.");
  }
  return data as T;
}

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handle<T>(res);
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(path, { method: "GET", cache: "no-store" });
  return handle<T>(res);
}

export async function apiPatch<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handle<T>(res);
}
