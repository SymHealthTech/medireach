import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { Grievance } from "@/models/Grievance";

/**
 * DPDP grievance queue (spec §6.4, §15.8) — data-related complaints/requests
 * land here so they're tracked, not lost in an inbox. Filterable by status.
 */
export const GET = route({ roles: Roles.adminOnly }, async (req) => {
  const status = new URL(req.url).searchParams.get("status");
  const filter = status ? { status } : {};
  const grievances = await Grievance.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  return jsonOk({
    grievances: grievances.map((g) => ({
      id: String(g._id),
      contactEmail: g.contactEmail,
      contactName: g.contactName ?? null,
      kind: g.kind,
      message: g.message,
      status: g.status,
      resolutionNote: g.resolutionNote ?? null,
      createdAt: g.createdAt,
    })),
  });
});
