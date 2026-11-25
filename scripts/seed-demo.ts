/**
 * `npm run seed:demo` — publish the FICTIONAL demo doctors from
 * src/fixtures/demo-doctors (noindex) with sample
 * appointment requests.
 *
 *   --owner=you@example.com   login email for the first demo doctor, so you can
 *                             sign in at /login and see the doctor account
 *   --reset-inquiries         replace their appointment requests with the fixture ones
 *   --force                   allow the production database (demo doctors would
 *                             then appear in hub pages, though noindex)
 */
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { backfillUids } from "@/lib/uid";
import { DEFAULT_DB_NAME, env } from "@/lib/env";
import { seedDemoDoctors } from "@/lib/seed/demo";

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

async function main() {
  const db = env.mongoDbName();
  if (db === DEFAULT_DB_NAME && !process.argv.includes("--force")) {
    throw new Error(
      `Refusing to publish demo doctors into "${db}" (production). ` + `Set MONGODB_DB to a dev database (e.g. medireach_dev), or pass --force.`,
    );
  }
  await connectToDatabase();
  const results = await seedDemoDoctors({ ownerEmail: arg("owner"), resetInquiries: process.argv.includes("--reset-inquiries") });
  await backfillUids();
  console.log(`Published ${results.length} demo doctor(s) into "${db}":`);
  for (const r of results) console.log(`  ${r.url}  (${r.inquiries} appointment requests)`);
  if (arg("owner")) console.log(`Login email for the first demo doctor: ${arg("owner")}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
