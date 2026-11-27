import Link from "next/link";
import { Route, Send } from "lucide-react";
import { Pill } from "@/components/admin/StatusBadge";
import { timeAgo } from "@/lib/format";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";
import { Payment } from "@/models/Payment";
import { Visit } from "@/models/Visit";
import { todayIST } from "@/lib/visits/days";

/**
 * Super admin overview: websites sent for review (by sales executives), with
 * who sent them and whether the payment has arrived. Publish from the last
 * step of each editor once it has.
 */
export async function ReviewQueue() {
  const pick = { status: 1, updatedAt: 1, salesExecutive: 1, setupPaidAt: 1 } as const;
  const [doctors, sites] = await Promise.all([
    DoctorProfile.find({ status: "review" }).select({ ...pick, title: 1, firstName: 1, lastName: 1, displayName: 1 }).sort({ updatedAt: -1 }).limit(30).lean(),
    Establishment.find({ status: "review" }).select({ ...pick, name: 1, kind: 1 }).sort({ updatedAt: -1 }).limit(30).lean(),
  ]);
  if (doctors.length + sites.length === 0) return null;
  const paidIds = new Set(
    (
      await Payment.find({ $or: [{ doctorId: { $in: doctors.map((d) => d._id) } }, { establishmentId: { $in: sites.map((s) => s._id) } }, { hospitalId: { $in: sites.map((s) => s._id) } }] })
        .select({ doctorId: 1, establishmentId: 1, hospitalId: 1 })
        .lean()
    ).map((p) => String(p.doctorId ?? p.establishmentId ?? p.hospitalId)),
  );
  const rows = [
    ...doctors.map((d) => ({
      id: String(d._id),
      name: d.displayName || `${d.title || "Dr."} ${d.firstName} ${d.lastName}`,
      kind: "Doctor",
      by: d.salesExecutive,
      paid: Boolean(d.setupPaidAt) || paidIds.has(String(d._id)),
      at: d.updatedAt,
      href: `/admin/doctors/${d._id}?step=publish`,
    })),
    ...sites.map((s) => ({
      id: String(s._id),
      name: s.name,
      kind: s.kind === "hospital" ? "Hospital" : "Clinic",
      by: s.salesExecutive,
      paid: Boolean(s.setupPaidAt) || paidIds.has(String(s._id)),
      at: s.updatedAt,
      href: `/admin/establishments/${s._id}?kind=${s.kind}&step=publish`,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <section aria-labelledby="review-queue" className="rounded-xl border border-line bg-card p-5 shadow-soft">
      <h2 id="review-queue" className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Send className="size-4" strokeWidth={1.75} /> Waiting to publish
        <span className="ml-auto text-xs font-normal text-muted-foreground">{rows.length}</span>
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">Sent for review. Publish once the payment is received.</p>
      <ul className="mt-3 divide-y divide-line">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={r.href} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm hover:underline">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">{r.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {[r.kind, r.by ? `by ${r.by}` : null, timeAgo(r.at)].filter(Boolean).join(" · ")}
                </span>
              </span>
              {r.paid ? <Pill tone="leaf">Payment received</Pill> : <Pill tone="marigold">No payment yet</Pill>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Super admin overview: field visits logged today, per sales executive. */
export async function FieldVisitsToday() {
  const today = todayIST();
  const rows = await Visit.aggregate<{ _id: string; n: number }>([{ $match: { day: today } }, { $group: { _id: "$salesName", n: { $sum: 1 } } }, { $sort: { n: -1 } }]);
  const total = rows.reduce((n, r) => n + r.n, 0);
  return (
    <Link href="/admin/visits?range=today" className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-line bg-card p-4 text-sm shadow-soft transition hover:border-ink/30">
      <span className="flex items-center gap-2 font-semibold text-ink">
        <Route className="size-4" strokeWidth={1.75} /> Field visits today
      </span>
      <strong className="font-display text-2xl tabular-nums text-ink">{total}</strong>
      <span className="text-muted-foreground">{rows.length ? rows.map((r) => `${r._id} ${r.n}`).join(" · ") : "None logged yet"}</span>
    </Link>
  );
}
