import { jsonOk } from "@/lib/api/errors";
import { route, Roles } from "@/lib/api/guard";
import { Doctor } from "@/models/Doctor";
import { Invoice } from "@/models/Invoice";

/**
 * Business-level billing & revenue dashboard (spec §6.2) — MediReach's own
 * subscription revenue (distinct from each clinic's patient-fee collection,
 * §9.4). Active subscriptions, churn, paid revenue, and outstanding amounts.
 */
export const GET = route({ roles: Roles.adminOnly }, async () => {
  const [byStatus, paidAgg, outstandingAgg] = await Promise.all([
    Doctor.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$accountStatus", count: { $sum: 1 } } },
    ]),
    Invoice.aggregate<{ total: number; count: number }>([
      { $match: { status: "paid", paidAt: { $gte: new Date(Date.now() - 30 * 86_400_000) } } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
    Invoice.aggregate<{ total: number; count: number }>([
      { $match: { status: { $in: ["pending", "overdue"] } } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
  ]);

  const counts: Record<string, number> = {};
  for (const row of byStatus) counts[row._id] = row.count;

  return jsonOk({
    subscriptions: {
      active: counts.active ?? 0,
      paused: counts.paused ?? 0,
      unsubscribed: counts.unsubscribed ?? 0,
      suspended: counts.suspended ?? 0,
      incompleteOnboarding: counts["incomplete-onboarding"] ?? 0,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
    },
    revenue: {
      paidLast30dInr: paidAgg[0]?.total ?? 0,
      paidInvoicesLast30d: paidAgg[0]?.count ?? 0,
      outstandingInr: outstandingAgg[0]?.total ?? 0,
      outstandingInvoices: outstandingAgg[0]?.count ?? 0,
    },
  });
});
