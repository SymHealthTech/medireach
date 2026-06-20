import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { AuditLog } from "@/models/AuditLog";

/**
 * Audit log viewer (spec §6.4, §15.4) — who accessed/changed what, and when,
 * across the platform, including admin's own actions (§6.7). Paginated, newest
 * first, optionally filtered by action or actor role.
 */
export const GET = route({ roles: Roles.adminOnly }, async (req) => {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const actorRole = url.searchParams.get("role");
  const before = url.searchParams.get("before"); // ISO date cursor

  const filter: Record<string, unknown> = {};
  if (action) filter.action = action;
  if (actorRole) filter.actorRole = actorRole;
  if (before) filter.createdAt = { $lt: new Date(before) };

  const entries = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  return jsonOk({
    entries: entries.map((e) => ({
      id: String(e._id),
      actorId: String(e.actorId),
      actorRole: e.actorRole,
      action: e.action,
      targetType: e.targetType ?? null,
      targetId: e.targetId ? String(e.targetId) : null,
      doctorScope: e.doctorScope ? String(e.doctorScope) : null,
      createdAt: e.createdAt,
    })),
    nextCursor: entries.length === 100 ? entries[entries.length - 1]!.createdAt : null,
  });
});
