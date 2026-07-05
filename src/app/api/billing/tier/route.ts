import { z } from "zod";
import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { loadDoctor } from "@/lib/api/account";
import { audit } from "@/lib/api/audit";
import { applyUpgrade, scheduleDowngrade } from "@/lib/billing/tier-change";

/**
 * Doctor-initiated tier switch from the Billing screen (Change 6):
 *  - upgrade:   Starter → Pro, IMMEDIATE (voice unlocks now; current cycle keeps
 *               its ₹499 Starter billing, Pro per-patient starts next cycle).
 *  - downgrade: Pro → Starter, at the NEXT cycle boundary (voice retained until
 *               the current paid cycle ends; recorded as tierChangePending and
 *               applied by the billing cron at rollover).
 * Both directions are also available to admins via the doctor actions route.
 */
const schema = z.object({ action: z.enum(["upgrade", "downgrade"]) });

export const POST = route({ roles: Roles.doctorOnly }, async (req, ctx) => {
  const { action } = await parseBody(req, schema);
  const doctor = await loadDoctor(ctx);

  if (action === "upgrade") {
    applyUpgrade(doctor);
  } else {
    scheduleDowngrade(doctor);
  }
  await doctor.save();

  await audit(ctx, `billing.tier.${action}`, {
    targetType: "Doctor",
    targetId: doctor._id,
    meta: { tier: doctor.tier, pending: doctor.tierChangePending ?? null },
  });

  return jsonOk({
    ok: true,
    tier: doctor.tier,
    tierChangePending: doctor.tierChangePending ?? null,
  });
});
