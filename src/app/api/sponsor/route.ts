import { z } from "zod";
import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody, fields } from "@/lib/api/validate";
import { requireDoctorId } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";
import { Sponsor } from "@/models/Sponsor";
import { PrescriptionTemplate } from "@/models/PrescriptionTemplate";

/**
 * Sponsor (medical store) management (spec §8, §6.3). One sponsor per doctor for
 * v1. Saving a sponsor also syncs the prescription template footer (the ad
 * slot) so the displayed footer and the sponsor record stay consistent. The
 * payer relationship for billing is tracked here and reconciled in Phase 5.
 */
export const GET = route({ roles: Roles.doctorOnly }, async (_req, ctx) => {
  const sponsor = await Sponsor.findOne({ doctorId: requireDoctorId(ctx) }).lean();
  return jsonOk({ sponsor: sponsor ?? null });
});

const schema = z.object({
  storeName: z.string().trim().min(1).max(160),
  contactNumber: fields.mobile,
  footerContent: z.string().trim().max(300).optional().default(""),
});

export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const doctorId = requireDoctorId(ctx);
  const data = await parseBody(req, schema);

  const sponsor = await Sponsor.findOneAndUpdate(
    { doctorId },
    {
      $set: {
        storeName: data.storeName,
        contactNumber: data.contactNumber,
        footerContent: data.footerContent,
        paymentResponsibility: "active",
      },
      $setOnInsert: { doctorId },
    },
    { new: true, upsert: true },
  );

  // Sync the rendered footer (ad slot) with the sponsor details.
  await PrescriptionTemplate.updateOne(
    { doctorId },
    {
      $set: {
        footer: {
          storeName: data.storeName,
          storeAddress: data.footerContent,
          storeContact: data.contactNumber,
        },
      },
    },
    { upsert: true },
  );

  await audit(ctx, "sponsor.upsert", { targetType: "Sponsor", targetId: sponsor._id });
  return jsonOk({ ok: true, sponsorId: sponsor._id.toString() });
});
