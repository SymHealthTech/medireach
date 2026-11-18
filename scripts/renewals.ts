/**
 * `npm run renewals` — run the daily renewals job by hand (the Vercel cron
 * calls /api/cron/renewals once a day). See src/lib/renewals-job.ts.
 *
 *   npm run renewals                dry run (default): lists reminders and lapses, sends and writes nothing
 *   npm run renewals -- --apply     sends the emails and updates statuses
 *
 * Outside Next, cached public pages can't be refreshed from here; a site
 * lapsed by a CLI run shows its notice once the page cache expires (within a
 * day). The cron route refreshes them immediately.
 */
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { runRenewalJob } from "@/lib/renewals-job";

const apply = process.argv.includes("--apply");

async function main() {
  await connectToDatabase();
  console.log(`${apply ? "APPLYING" : "DRY RUN"} renewals job on database "${env.mongoDbName()}"\n`);
  const r = await runRenewalJob({ dryRun: !apply });
  console.log(`Checked ${r.checked} site(s) with a renewal date; ${r.statusUpdates} status update(s).`);
  for (const x of r.reminders) console.log(`  reminder  ${x.days}-day  ${x.kind.padEnd(8)} ${x.name}  due ${x.due.slice(0, 10)}  ${x.ownerEmail ?? "(no owner email)"}`);
  for (const x of r.lapsed) console.log(`  lapse              ${x.kind.padEnd(8)} ${x.name}  due ${x.due.slice(0, 10)}`);
  for (const f of r.failures) console.log(`  FAILED    ${f}`);
  if (apply) console.log(`\nDigest to the team: ${r.digestSent ? "sent" : "not sent (nothing to report, or no notify address)"}`);
  else console.log("\nNothing was sent or written. Add --apply to run it.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
