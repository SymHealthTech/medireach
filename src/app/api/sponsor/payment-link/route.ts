import { z } from "zod";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { requireDoctorId } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";
import { Sponsor } from "@/models/Sponsor";
import { createPaymentLink } from "@/lib/integrations/razorpay";
import { BILLING } from "@/lib/constants";

/**
 * Generate a shareable Razorpay payment link sent to the sponsoring store's
 * number so the store can pay the doctor's subscription bill directly in
 * exchange for the footer placement (spec §8). Defaults to the ₹299 monthly
 * minimum; the full invoice/payer reconciliation lands in Phase 5.
 */
const schema = z.object({ amountInr: z.number().min(1).max(100000).optional() });

export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const doctorId = requireDoctorId(ctx);
  const { amountInr } = await parseBody(req, schema);

  const sponsor = await Sponsor.findOne({ doctorId });
  if (!sponsor) throw Errors.badRequest("Add a sponsor store first.");

  try {
    const link = await createPaymentLink({
      amountInr: amountInr ?? BILLING.MONTHLY_MINIMUM_INR,
      description: "MediReach subscription (sponsored)",
      customerName: sponsor.storeName,
      contact: sponsor.contactNumber,
      notes: { doctorId, sponsorId: sponsor._id.toString(), purpose: "sponsor-subscription" },
    });
    await audit(ctx, "sponsor.payment-link", { targetType: "Sponsor", targetId: sponsor._id });
    return jsonOk({ shortUrl: link.shortUrl });
  } catch (err) {
    console.error("[sponsor] payment link failed:", err);
    throw Errors.badRequest("Could not create the payment link. Please try again.");
  }
});
