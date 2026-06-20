import mongoose from "mongoose";
import { env } from "@/lib/env";

/**
 * MongoDB (Atlas) connection helper for the Next.js serverless runtime.
 *
 * In dev and on Vercel, modules are re-evaluated across hot reloads / lambda
 * invocations. Caching the connection promise on `globalThis` prevents opening
 * a brand-new connection pool on every request (which exhausts Atlas limits).
 */

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __medireachMongoose: MongooseCache | undefined;
}

const cache: MongooseCache =
  globalThis.__medireachMongoose ?? { conn: null, promise: null };

globalThis.__medireachMongoose = cache;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    mongoose.set("strictQuery", true);
    cache.promise = mongoose.connect(env.mongoUri(), {
      // Reasonable serverless defaults; Atlas Flex includes backups (spec §14).
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }

  return cache.conn;
}
