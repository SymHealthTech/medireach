import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { Lead } from "@/models/Lead";

/** Lead tracking list (spec §6.5): website leads from new → demo → converted. */
export const GET = route({ roles: Roles.adminOnly }, async (req) => {
  const status = new URL(req.url).searchParams.get("status");
  const filter = status ? { status } : {};
  const leads = await Lead.find(filter).sort({ createdAt: -1 }).limit(300).lean();
  return jsonOk({
    leads: leads.map((l) => ({
      id: String(l._id),
      name: l.name,
      clinicName: l.clinicName,
      phone: l.phone,
      source: l.source,
      status: l.status,
      notes: l.notes ?? null,
      createdAt: l.createdAt,
    })),
  });
});
