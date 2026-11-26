/**
 * `npm run seed:demo-sites` — publish the FICTIONAL sample clinic and hospital
 * websites (src/fixtures/sample-sites, one per specialty theme) as noindex
 * establishments. Meant for the permanent demo database:
 *
 *   MONGODB_DB=medireach_demo npm run seed:demo-sites
 *
 *   --force   allow the production database (they would then appear in the
 *             public clinic and hospital lists, though noindex)
 */
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { backfillUids } from "@/lib/uid";
import { DEFAULT_DB_NAME, env } from "@/lib/env";
import { seedDemoSites } from "@/lib/seed/demo-sites";

async function main() {
  const db = env.mongoDbName();
  if (db === DEFAULT_DB_NAME && !process.argv.includes("--force")) {
    throw new Error(`Refusing to publish demo clinics and hospitals into "${db}" (production). Set MONGODB_DB=medireach_demo, or pass --force.`);
  }
  await connectToDatabase();
  const sites = await seedDemoSites();
  await backfillUids();
  console.log(`Published ${sites.length} demo site(s) into "${db}":`);
  for (const s of sites) console.log(`  ${s.kind.padEnd(8)} ${s.name}  ${s.url}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
