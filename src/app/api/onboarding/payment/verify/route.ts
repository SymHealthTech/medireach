import { z } from "zod";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { loadDoctor } from "@/lib/api/account";
import { audit } from "@/lib/api/audit";
import { verifyPaymentSignature } from "@/lib/integrations/razorpay";
import { nextSequence } from "@/models/Counter";
import { PrescriptionTemplate } from "@/models/PrescriptionTemplate";

/**
 * Onboarding step 6→7 (spec §5.3, §11): verify the joining-fee payment, then
 * ACTIVATE the account immediately — no manual approval gate. This is the event
 * that sets the fixed `cycleStartDate` (billing Day 1) and mints the doctor's
 * permanent app ID (e.g. "MR-00142"). A default prescription template is
 * created so the doctor has something selected from day one.
 */
const schema = z.object({
  orderId: z.string().trim().min(1),
  paymentId: z.string().trim().min(1),
  signature: z.string().trim().min(1),
});

function formatAppId(seq: number): string {
  return `MR-${seq.toString().padStart(5, "0")}`;
}

export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const { orderId, paymentId, signature } = await parseBody(req, schema);

  if (!verifyPaymentSignature(orderId, paymentId, signature)) {
    throw Errors.badRequest("Payment could not be verified. If money was deducted, contact support.");
  }

  const doctor = await loadDoctor(ctx);

  // Idempotent: a repeat verify on an already-active account is a no-op.
  if (doctor.accountStatus === "active" && doctor.onboardingStep >= 7) {
    return jsonOk({ ok: true, appId: doctor.appId, alreadyActive: true });
  }

  if (!doctor.appId) {
    doctor.appId = formatAppId(await nextSequence("doctorAppId"));
  }
  doctor.accountStatus = "active";
  doctor.onboardingStep = 7;
  doctor.cycleStartDate = new Date(); // fixed Day 1, never recalculated (§11)
  // Snapshot the tier the first cycle bills at (two-tier system). Defaults to
  // Starter; the cron re-snapshots this at every cycle rollover.
  doctor.currentCycleTier = doctor.tier;

  // Default prescription template (preset-plus-light-customization, §16.3).
  if (!doctor.selectedTemplateId) {
    const template = await PrescriptionTemplate.create({
      doctorId: doctor._id,
      presetKey: "classic",
      logoPlacement: "left",
    });
    doctor.selectedTemplateId = template._id;
  }

  await doctor.save();

  await audit(ctx, "onboarding.complete", {
    targetType: "Doctor",
    targetId: doctor._id,
    meta: { appId: doctor.appId, razorpayPaymentId: paymentId },
  });

  return jsonOk({ ok: true, appId: doctor.appId });
});
