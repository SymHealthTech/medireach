import "server-only";
import { Errors } from "@/lib/api/errors";

/**
 * Minimal in-memory sliding-window rate limiter (spec §15.1: rate-limit login
 * attempts, lock after repeated failures). Sufficient for a single-instance v1;
 * swap for a Redis/Upstash backend when the app scales beyond one Vercel
 * instance, since in-memory state is per-lambda.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    throw Errors.tooManyRequests();
  }
}

/** Derive a best-effort client IP from forwarded headers. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
