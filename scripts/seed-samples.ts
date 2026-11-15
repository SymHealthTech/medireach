/**
 * `npm run seed:samples` — publish the two FICTIONAL sample doctors (noindex)
 * for local testing. Refuses to run against the production database unless
 * `--force` is passed, because published samples would appear in hub pages.
 */
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { DEFAULT_DB_NAME, env } from "@/lib/env";
import { seedSampleDoctors } from "@/lib/seed/samples";

async function main() {
  const db = env.mongoDbName();
  if (db === DEFAULT_DB_NAME && !process.argv.includes("--force")) {
    throw new Error(
      `Refusing to publish sample doctors into "${db}" (production). ` +
        `Set MONGODB_DB to a dev database (e.g. medireach_dev), or pass --force.`,
    );
  }
  await connectToDatabase();
  const urls = await seedSampleDoctors();
  console.log(`Published ${urls.length} sample doctors into "${db}":`);
  for (const u of urls) console.log(`  ${u}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
