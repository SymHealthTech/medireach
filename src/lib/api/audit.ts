import "server-only";
import type { Types } from "mongoose";
import { AuditLog } from "@/models/AuditLog";
import type { AuthContext } from "@/lib/api/context";

/**
 * Append an audit entry (spec §15.4). Best-effort and non-throwing: an audit
 * write failing must never take down the user-facing action, but the attempt
 * is logged. Every meaningful access/change to personal data — and every admin
 * action (§6.7) — should call this.
 */
export async function audit(
  ctx: AuthContext,
  action: string,
  opts: {
    targetType?: string;
    targetId?: Types.ObjectId | string;
    ip?: string;
    meta?: Record<string, unknown>;
  } = {},
): Promise<void> {
  try {
    await AuditLog.create({
      actorId: ctx.userId,
      actorRole: ctx.role,
      doctorScope: ctx.doctorId ?? undefined,
      action,
      targetType: opts.targetType,
      targetId: opts.targetId,
      ip: opts.ip,
      meta: opts.meta,
    });
  } catch (err) {
    console.error("[audit] failed to write audit log:", action, err);
  }
}
