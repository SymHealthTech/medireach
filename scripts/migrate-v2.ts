/**
 * `npm run migrate:v2` — move data to the v2 product model (doctor portfolio,
 * clinic website, small hospital website; yearly renewals). See
 * src/lib/migrations/v2.ts for exactly what changes.
 *
 *   npm run migrate:v2                       dry run (default): prints the plan, writes nothing
 *   npm run migrate:v2 -- --apply            writes the changes
 *   npm run migrate:v2 -- --apply --drop-legacy
 *                                            also removes the old fields (only after v2 code is live)
 *   add --verbose to print every change instead of the first 20
 *
 * Re-runnable: a second run reports 0 changes.
 */
import mongoose from "mongoose";
import type { Db } from "mongodb";
import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { migrateV2 } from "@/lib/migrations/v2";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const dropLegacy = args.has("--drop-legacy");
const verbose = args.has("--verbose");

const fmt = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === "string" && x.length > 60 ? `${x.slice(0, 57)}…` : x));

async function main() {
  if (dropLegacy && !apply) console.log("(--drop-legacy shown as a dry run; add --apply to write)");
  const conn = await connectToDatabase();
  console.log(`${apply ? "APPLYING" : "DRY RUN"} migrate:v2 on database "${env.mongoDbName()}"${dropLegacy ? " (dropping legacy fields)" : ""}\n`);

  const report = await migrateV2(conn.connection.db as unknown as Db, { apply, dropLegacy });

  console.table(report.counts);
  const shown = verbose ? report.changes : report.changes.slice(0, 20);
  for (const ch of shown) {
    console.log(`\n[${ch.collection}] ${ch.label}  _id=${ch.id}`);
    for (const [k, v] of Object.entries(ch.set)) console.log(`   set   ${k} = ${fmt(v)}`);
    for (const k of ch.unset ?? []) console.log(`   unset ${k}`);
  }
  if (shown.length < report.changes.length) console.log(`\n… ${report.changes.length - shown.length} more (use --verbose)`);

  if (report.warnings.length) {
    console.log("\nNeeds a look:");
    for (const w of report.warnings) console.log(` - ${w}`);
  }
  console.log(
    `\n${report.changes.length} change(s) ${apply ? "written" : "planned, nothing written. Re-run with --apply to write"}.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
