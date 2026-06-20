import "server-only";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { Errors } from "@/lib/api/errors";

/**
 * Authorize a scheduled-job (Vercel Cron) request. Cron calls carry
 * `Authorization: Bearer <CRON_SECRET>`; anything else is rejected so these
 * endpoints can't be triggered by the public. Uses a length-safe comparison.
 */
export function assertCron(req: NextRequest): void {
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.cronSecret()}`;
  if (header.length !== expected.length || header !== expected) {
    throw Errors.unauthorized("Invalid cron credentials.");
  }
}
