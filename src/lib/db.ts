import mongoose from "mongoose";
import { CLINIC_DB_NAME, env } from "@/lib/env";

/**
 * MongoDB (Atlas) connection helper for the Next.js serverless runtime.
 *
 * In dev and on Vercel, modules are re-evaluated across hot reloads / lambda
 * invocations. Caching the connection promise on `globalThis` prevents opening
 * a brand-new connection pool on every request (which exhausts Atlas limits).
 *
 * The database is chosen explicitly via `dbName` (not the URI path) so the
 * portfolio app can share the cluster connection string with the parked clinic
 * software without ever writing into the clinic's database.
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
    const dbName = env.mongoDbName();
    if (dbName === CLINIC_DB_NAME) {
      throw new Error(
        `MONGODB_DB is set to "${CLINIC_DB_NAME}", the clinic software's database. ` +
          `The portfolio app must use its own database.`,
      );
    }
    mongoose.set("strictQuery", true);
    cache.promise = mongoose.connect(env.mongoUri(), {
      dbName,
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
