/**
 * `npm run sync:templates` — rename the built design slots, mark them ready
 * and remove the retired card slots in an existing database (see
 * lib/seed/template-slots.ts). Safe to run
 * again. Live pages pick the change up when the templates cache refreshes
 * (within a day), or at once after saving any slot in Dashboard → Design
 * templates, or on the next deploy.
 */
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { syncTemplateSlots } from "@/lib/seed/template-slots";

async function main() {
  await connectToDatabase();
  const changes = await syncTemplateSlots();
  if (!changes.length) console.log(`Design slots in "${env.mongoDbName()}" are already up to date.`);
  for (const c of changes) {
    const parts = [c.renamed ? `renamed "${c.renamed.from}" → "${c.renamed.to}"` : "", c.madeReady ? "marked ready" : "", c.removed ? "removed (retired card slot)" : ""].filter(Boolean);
    console.log(`${c.slot}: ${parts.join(", ")}`);
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
