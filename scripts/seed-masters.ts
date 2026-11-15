/**
 * `npm run seed:masters` — seed cities, areas, specialties, degrees, councils,
 * template slots and the settings singleton. Safe to re-run.
 */
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { seedMasters } from "@/lib/seed/masters";

async function main() {
  await connectToDatabase();
  console.log(`Seeding master lists into database "${env.mongoDbName()}"…`);
  const counts = await seedMasters();
  console.log("Inserted (existing entries are left unchanged):");
  console.table(counts);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
