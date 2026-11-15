import "server-only";
import type { Types } from "mongoose";
import { AuditLog } from "@/models/AuditLog";
import type { AuthContext } from "@/lib/api/context";

/**
 * Append an audit entry. Best-effort and non-throwing: an audit write failing
 * must never take down the user-facing action, but the attempt is logged.
 * Every mutation (admin dashboard and doctor self-edit) should call this.
 */
export async function audit(
  ctx: AuthContext,
  action: string,
  opts: {
    entity?: string;
    entityId?: Types.ObjectId | string;
    diff?: Record<string, unknown>;
  } = {},
): Promise<void> {
  try {
    await AuditLog.create({
      actor: { id: ctx.userId, role: ctx.role, name: ctx.name },
      action,
      entity: opts.entity,
      entityId: opts.entityId,
      diff: opts.diff,
    });
  } catch (err) {
    console.error("[audit] failed to write audit log:", action, err);
  }
}
