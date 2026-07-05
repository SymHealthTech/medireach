import { z } from "zod";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { audit } from "@/lib/api/audit";
import { Doctor } from "@/models/Doctor";
import { issueOtp } from "@/lib/auth/otp";
import { sendOtpEmail } from "@/lib/integrations/email";
import { applyUpgrade, scheduleDowngrade, forceTier } from "@/lib/billing/tier-change";
import { DOC_REVIEW_STATUSES, TIERS } from "@/lib/constants";

/**
 * Admin actions on a doctor account (spec §6.1): suspend/reactivate, review the
 * verification document (mark reviewed/flagged — after-the-fact oversight, not a
 * pre-activation gate, §5.3), trigger a password reset, and change the account's
 * subscription tier (Change 7). Every action is audited (§6.7).
 *
 * `set-tier` follows the same timing rules as the doctor-facing switch by
 * default — upgrade is immediate, downgrade applies at the next cycle boundary —
 * unless `force: true`, which applies the change immediately in either direction
 * (an override, explicitly flagged in the audit log).
 */
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("suspend") }),
  z.object({ action: z.literal("reactivate") }),
  z.object({ action: z.literal("review-document"), status: z.enum(DOC_REVIEW_STATUSES) }),
  z.object({ action: z.literal("reset-password") }),
  z.object({ action: z.literal("set-tier"), tier: z.enum(TIERS), force: z.boolean().default(false) }),
]);

export const POST = route<{ id: string }>({ roles: Roles.adminOnly }, async (req, ctx, { id }) => {
  const body = await parseBody(req, schema);
  const doctor = await Doctor.findById(id);
  if (!doctor) throw Errors.notFound("Doctor not found.");

  switch (body.action) {
    case "suspend":
      doctor.accountStatus = "suspended";
      await doctor.save();
      break;

    case "reactivate":
      // Restore to active (or paused if there are still unpaid invoices handled
      // by the billing cron). Default to active here.
      doctor.accountStatus = "active";
      await doctor.save();
      break;

    case "review-document":
      if (!doctor.verificationDocument) throw Errors.badRequest("No document to review.");
      doctor.verificationDocument.reviewStatus = body.status;
      doctor.verificationDocument.reviewedAt = new Date();
      // Flagging a document is grounds to suspend (§6.1), but leave that as a
      // separate explicit action rather than auto-suspending here.
      await doctor.save();
      break;

    case "reset-password":
      if (doctor.email) {
        const code = await issueOtp("password-reset", doctor.email);
        await sendOtpEmail(doctor.email, code);
      } else {
        throw Errors.badRequest("Doctor has no email on file for reset.");
      }
      break;

    case "set-tier":
      if (body.force) {
        // Override: apply immediately in either direction.
        forceTier(doctor, body.tier);
      } else if (body.tier === "pro") {
        applyUpgrade(doctor); // immediate
      } else {
        scheduleDowngrade(doctor); // at next cycle boundary
      }
      await doctor.save();
      break;
  }

  // For a tier change, record the resulting state (and whether it was forced) so
  // the audit trail shows exactly what support did.
  const meta =
    body.action === "set-tier"
      ? { requestedTier: body.tier, force: body.force, resultingTier: doctor.tier, pending: doctor.tierChangePending ?? null }
      : undefined;
  await audit(ctx, `admin.doctor.${body.action}`, { targetType: "Doctor", targetId: id, meta });
  return jsonOk({ ok: true });
});
