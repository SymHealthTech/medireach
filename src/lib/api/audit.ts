import "server-only";
import type { Types } from "mongoose";
import { AuditLog } from "@/models/AuditLog";
import type { Role } from "@/lib/constants";

/** Who did it: an admin (from adminAction's auditCtx) or a doctor (Phase 7). */
export interface AuditActor {
  userId: string;
  role: Role;
  name: string;
}

/**
 * Append an audit entry. Best-effort and non-throwing: an audit write failing
 * must never take down the user-facing action, but the attempt is logged.
 * Every mutation (admin dashboard and doctor self-edit) should call this.
 */
export async function audit(
  actor: AuditActor,
  action: string,
  opts: {
    entity?: string;
    entityId?: Types.ObjectId | string;
    diff?: Record<string, unknown>;
  } = {},
): Promise<void> {
  try {
    await AuditLog.create({
      actor: { id: actor.userId, role: actor.role, name: actor.name },
      action,
      entity: opts.entity,
      entityId: opts.entityId,
      diff: opts.diff,
    });
  } catch (err) {
    console.error("[audit] failed to write audit log:", action, err);
  }
}

/** Shallow before/after diff of the keys that changed (for AuditLog.diff). */
export function shallowDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const a = JSON.stringify(before[key] ?? null);
    const b = JSON.stringify(after[key] ?? null);
    if (a !== b) out[key] = { from: before[key] ?? null, to: after[key] ?? null };
  }
  return out;
}
