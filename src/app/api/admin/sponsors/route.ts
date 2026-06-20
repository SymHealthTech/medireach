import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { Sponsor } from "@/models/Sponsor";
import { Doctor } from "@/models/Doctor";

/**
 * Sponsor (medical store) management list (spec §6.3): which store sponsors
 * which doctor, with payment status. Joins the doctor name for context.
 */
export const GET = route({ roles: Roles.adminOnly }, async () => {
  const sponsors = await Sponsor.find().sort({ updatedAt: -1 }).limit(200).lean();
  const doctorIds = sponsors.map((s) => s.doctorId);
  const doctors = await Doctor.find({ _id: { $in: doctorIds } }).select("name appId").lean();
  const byId = new Map(doctors.map((d) => [String(d._id), d]));

  return jsonOk({
    sponsors: sponsors.map((s) => ({
      id: String(s._id),
      storeName: s.storeName,
      contactNumber: s.contactNumber,
      paymentResponsibility: s.paymentResponsibility,
      doctorName: byId.get(String(s.doctorId))?.name ?? "(unknown)",
      doctorAppId: byId.get(String(s.doctorId))?.appId ?? null,
    })),
  });
});
