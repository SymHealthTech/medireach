/**
 * `npm run migrate:roles` — move to "super admin + sales executives" and field
 * visits (see
 * lib/admin/migrate-roles.ts). Safe to re-run. Prints the staff IDs it made.
 */
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { migrateDashboardRoles } from "@/lib/admin/migrate-roles";

async function main() {
  await connectToDatabase();
  const r = await migrateDashboardRoles();
  console.log(`Database "${env.mongoDbName()}":`);
  console.log(`- ${r.promoted} "admin" user(s) are now super admins`);
  console.log(`- ${r.staffIds.length} sales executive(s) got a staff ID${r.staffIds.length ? `:\n  ${r.staffIds.join("\n  ")}` : ""}`);
  console.log(`- ${r.owned} doctor/clinic/hospital website(s) linked to their sales executive`);
  console.log(`- ${r.formsKeyed} website form(s) prepared for visit matching, ${r.formsLinked} matched to a sales executive`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
