import { z } from "zod";
import { jsonOk, Errors } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { audit } from "@/lib/api/audit";
import { Doctor } from "@/models/Doctor";
import { issueOtp } from "@/lib/auth/otp";
import { sendOtpEmail } from "@/lib/integrations/email";
import { DOC_REVIEW_STATUSES } from "@/lib/constants";

/**
 * Admin actions on a doctor account (spec §6.1): suspend/reactivate, review the
 * verification document (mark reviewed/flagged — after-the-fact oversight, not a
 * pre-activation gate, §5.3), and trigger a password reset on their behalf.
 * Every action is audited (§6.7).
 */
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("suspend") }),
  z.object({ action: z.literal("reactivate") }),
  z.object({ action: z.literal("review-document"), status: z.enum(DOC_REVIEW_STATUSES) }),
  z.object({ action: z.literal("reset-password") }),
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
  }

  await audit(ctx, `admin.doctor.${body.action}`, { targetType: "Doctor", targetId: id });
  return jsonOk({ ok: true });
});
