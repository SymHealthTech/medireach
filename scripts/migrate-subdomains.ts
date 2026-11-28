/**
 * `npm run migrate:subdomains` — give every published doctor, clinic and
 * hospital that has none its own website address (subdomain). See
 * lib/migrations/subdomains.ts. Safe to re-run. Prints what it assigned.
 */
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { assignMissingSubdomains } from "@/lib/migrations/subdomains";

async function main() {
  await connectToDatabase();
  const r = await assignMissingSubdomains();
  console.log(`Database "${env.mongoDbName()}":`);
  console.log(`- ${r.doctors.length} doctor website(s) got an address${r.doctors.length ? `:\n  ${r.doctors.join("\n  ")}` : ""}`);
  console.log(`- ${r.sites.length} clinic/hospital website(s) got an address${r.sites.length ? `:\n  ${r.sites.join("\n  ")}` : ""}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
