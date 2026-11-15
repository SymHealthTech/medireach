"use client";

/**
 * Thin client-side fetch wrapper for our JSON API. Throws an Error carrying the
 * server's user-facing message so components can show it directly. A 401 means
 * the session is gone, so we bounce to the matching login screen.
 */
function handleUnauthorized(): void {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path === "/login" || path === "/admin/login") return;
  window.location.assign(path.startsWith("/admin") ? "/admin/login" : "/login");
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
