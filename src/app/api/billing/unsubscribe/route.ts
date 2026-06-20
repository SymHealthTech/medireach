import { z } from "zod";
import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { loadDoctor } from "@/lib/api/account";
import { audit } from "@/lib/api/audit";
import { currentCycle } from "@/lib/billing/cycle";

/**
 * Unsubscribe / re-subscribe (spec §12). Cancellation takes effect at the END
 * of the current paid cycle — not immediately — so the doctor keeps the access
 * they've paid for. Data is preserved per the 1-year retention policy and they
 * can rejoin anytime. Provides a clear, available cancel path (RBI recurring-
 * payment expectations). The billing cron flips status to `unsubscribed` once
 * `unsubscribeEffectiveAt` passes.
 */
const schema = z.object({ cancel: z.boolean().default(true) });

export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const { cancel } = await parseBody(req, schema);
  const doctor = await loadDoctor(ctx);

  if (cancel) {
    const effectiveAt = doctor.cycleStartDate ? currentCycle(doctor.cycleStartDate).periodEnd : new Date();
    doctor.pendingUnsubscribe = true;
    doctor.unsubscribeEffectiveAt = effectiveAt;
    await doctor.save();
    await audit(ctx, "billing.unsubscribe.request", { targetType: "Doctor", targetId: doctor._id });
    return jsonOk({ ok: true, effectiveAt });
  }

  // Re-subscribe / undo a pending cancellation.
  doctor.pendingUnsubscribe = false;
  doctor.unsubscribeEffectiveAt = undefined;
  if (doctor.accountStatus === "unsubscribed") doctor.accountStatus = "active";
  await doctor.save();
  await audit(ctx, "billing.resubscribe", { targetType: "Doctor", targetId: doctor._id });
  return jsonOk({ ok: true, resubscribed: true });
});
