/**
 * Centralized, validated access to server-side environment variables.
 *
 * Rather than reading `process.env.X` scattered across the codebase (easy to
 * typo, no fail-fast), every secret is read here. Values are only required at
 * the point of use — `requireEnv` throws a clear error if a key is missing when
 * a feature that needs it actually runs, instead of crashing cryptically deep
 * inside a vendor SDK.
 *
 * NEVER expose non-NEXT_PUBLIC_ values to the client (spec §15.3).
 */

export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.length === 0) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        `Add it to .env.local (see .env.example).`,
    );
  }
  return value;
}

export function optionalEnv(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export const env = {
  appUrl: () => optionalEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  mongoUri: () => requireEnv("MONGODB_URI"),
  sessionSecret: () => requireEnv("AUTH_SESSION_SECRET"),
  deviceSecret: () => requireEnv("AUTH_DEVICE_SECRET"),
  adminRouteSecret: () => requireEnv("ADMIN_ROUTE_SECRET"),
  cronSecret: () => requireEnv("CRON_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
};
