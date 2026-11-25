/**
 * `npm run backfill:uids` — give every doctor, clinic and hospital website
 * without a UID its permanent one (lib/uid.ts). Safe to run again. The admin
 * lists also do this on load, so running it is optional.
 */
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { backfillUids } from "@/lib/uid";

async function main() {
  await connectToDatabase();
  const n = await backfillUids();
  console.log(`Gave ${n} website(s) a UID in "${env.mongoDbName()}".`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
