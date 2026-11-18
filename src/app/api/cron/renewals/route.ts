import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { runRenewalJob } from "@/lib/renewals-job";

/**
 * Daily renewals job, called by Vercel Cron (vercel.json, 09:00 IST).
 * Vercel sends `Authorization: Bearer <CRON_SECRET>`; anything else is
 * refused. `?dryRun=1` reports what would happen without writing or sending.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(header: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(header ?? "");
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 503 });
  if (!authorised(req.headers.get("authorization"), secret)) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  await connectToDatabase();
  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";
  const result = await runRenewalJob({ dryRun });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
