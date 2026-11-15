import "server-only";
import { connectToDatabase } from "@/lib/db";
import { RateLimit } from "@/models/RateLimit";

/**
 * Database-backed fixed-window rate limiter (works across serverless
 * instances). `hit` counts one attempt and reports whether it is allowed.
 */
export async function hitRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }> {
  await connectToDatabase();
  const windowIndex = Math.floor(now / windowMs);
  const windowEnd = (windowIndex + 1) * windowMs;
  const doc = await RateLimit.findOneAndUpdate(
    { key: `${key}:${windowIndex}` },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(windowEnd) } },
    { upsert: true, new: true },
  ).lean();
  const count = doc?.count ?? 1;
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: Math.ceil((windowEnd - now) / 1000),
  };
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIpFrom(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
