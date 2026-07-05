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
  const [byStatus, tierCounts, paidByTier, outstandingAgg] = await Promise.all([
    Doctor.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$accountStatus", count: { $sum: 1 } } },
    ]),
    // Doctors per tier among live subscriptions (Change 7).
    Doctor.aggregate<{ _id: string; count: number }>([
      { $match: { accountStatus: { $in: ["active", "paused"] } } },
      { $group: { _id: "$tier", count: { $sum: 1 } } },
    ]),
    // Paid revenue in the last 30 days, split by the tier each invoice billed at.
    Invoice.aggregate<{ _id: string; total: number; count: number }>([
      { $match: { status: "paid", paidAt: { $gte: new Date(Date.now() - 30 * 86_400_000) } } },
      { $group: { _id: "$tier", total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
    Invoice.aggregate<{ total: number; count: number }>([
      { $match: { status: { $in: ["pending", "overdue"] } } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
  ]);

  const counts: Record<string, number> = {};
  for (const row of byStatus) counts[row._id] = row.count;

  const tiers: Record<string, number> = {};
  for (const row of tierCounts) tiers[row._id ?? "starter"] = row.count;

  const paid: Record<string, { total: number; count: number }> = {};
  for (const row of paidByTier) paid[row._id ?? "starter"] = { total: row.total, count: row.count };
  const starterPaid = paid.starter ?? { total: 0, count: 0 };
  const proPaid = paid.pro ?? { total: 0, count: 0 };

  return jsonOk({
    subscriptions: {
      active: counts.active ?? 0,
      paused: counts.paused ?? 0,
      unsubscribed: counts.unsubscribed ?? 0,
      suspended: counts.suspended ?? 0,
      incompleteOnboarding: counts["incomplete-onboarding"] ?? 0,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
    },
    tiers: {
      starter: tiers.starter ?? 0,
      pro: tiers.pro ?? 0,
    },
    revenue: {
      paidLast30dInr: starterPaid.total + proPaid.total,
      paidInvoicesLast30d: starterPaid.count + proPaid.count,
      starterPaidLast30dInr: starterPaid.total,
      starterInvoicesLast30d: starterPaid.count,
      proPaidLast30dInr: proPaid.total,
      proInvoicesLast30d: proPaid.count,
      outstandingInr: outstandingAgg[0]?.total ?? 0,
      outstandingInvoices: outstandingAgg[0]?.count ?? 0,
    },
  });
});
