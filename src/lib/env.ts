/**
 * Centralized, validated access to server-side environment variables.
 *
 * Rather than reading `process.env.X` scattered across the codebase (easy to
 * typo, no fail-fast), every secret is read here. Values are only required at
 * the point of use — `requireEnv` throws a clear error if a key is missing when
 * a feature that needs it actually runs, instead of crashing cryptically deep
 * inside a vendor SDK.
 *
 * NEVER expose non-NEXT_PUBLIC_ values to the client.
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
  return process.env[key] || fallback;
}

/**
 * Database the portfolio app writes to. Deliberately separate from the parked
 * clinic software's `medireach` database (same cluster), whose collection names
 * (leads, auditlogs, admins) overlap with ours.
 */
export const DEFAULT_DB_NAME = "medireach_portfolio";
export const CLINIC_DB_NAME = "medireach";

export const env = {
  siteUrl: () => optionalEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),
  mongoUri: () => requireEnv("MONGODB_URI"),
  mongoDbName: () => optionalEnv("MONGODB_DB", DEFAULT_DB_NAME),
  sessionSecret: () => requireEnv("AUTH_SESSION_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
};
