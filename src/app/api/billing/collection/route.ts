import { Types } from "mongoose";
import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { requireDoctorId } from "@/lib/api/context";
import { loadDoctor } from "@/lib/api/account";
import { Visit } from "@/models/Visit";
import { startOfTodayIST } from "@/lib/time";
import { currentCycle } from "@/lib/billing/cycle";

/**
 * Collection sheets (spec §9.4) — the clinic's OWN patient-fee revenue (distinct
 * from MediReach's subscription billing). In-app daily + cycle totals derived
 * from the Fees field on confirmed visits, tenant-scoped.
 */
async function sumFees(doctorId: string, from: Date, to: Date): Promise<{ total: number; count: number }> {
  const result = await Visit.aggregate<{ total: number; count: number }>([
    {
      $match: {
        doctorId: new Types.ObjectId(doctorId),
        status: "confirmed",
        confirmedAt: { $gte: from, $lt: to },
      },
    },
    { $group: { _id: null, total: { $sum: { $ifNull: ["$fees", 0] } }, count: { $sum: 1 } } },
  ]);
  return { total: result[0]?.total ?? 0, count: result[0]?.count ?? 0 };
}

export const GET = route({ roles: Roles.doctorOnly }, async (_req, ctx) => {
  const doctorId = requireDoctorId(ctx);
  const doctor = await loadDoctor(ctx);

  const now = new Date();
  const todayStart = startOfTodayIST(now);
  const tomorrow = new Date(todayStart.getTime() + 86_400_000);

  const today = await sumFees(doctorId, todayStart, tomorrow);

  let cycle = { total: 0, count: 0 };
  if (doctor.cycleStartDate) {
    const c = currentCycle(doctor.cycleStartDate, now);
    cycle = await sumFees(doctorId, c.periodStart, c.periodEnd);
  }

  return jsonOk({ today, cycle });
});
