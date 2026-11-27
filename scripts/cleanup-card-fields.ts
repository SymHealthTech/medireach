/**
 * `npm run cleanup:card-fields` — remove the retired visiting card fields
 * (`cardTemplateId`, `cardStyle`, and the form answer `data.cardStyle`) from
 * doctors, clinic/hospital sites and website forms (lib/migrations/card-fields.ts).
 * The card follows the website design now, so nothing reads them. Safe to run again.
 */
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { removeOldCardFields } from "@/lib/migrations/card-fields";

async function main() {
  await connectToDatabase();
  const n = await removeOldCardFields();
  console.log(`Removed old card fields in "${env.mongoDbName()}": ${n.doctors} doctor(s), ${n.establishments} clinic/hospital site(s), ${n.intakes} website form(s).`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
