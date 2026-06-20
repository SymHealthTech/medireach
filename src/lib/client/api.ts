"use client";

/**
 * Thin client-side fetch wrapper for our JSON API. Throws an Error carrying the
 * server's user-facing message so components can show it directly.
 */
export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Something went wrong.");
  return data as T;
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(path, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Something went wrong.");
  return data as T;
}
