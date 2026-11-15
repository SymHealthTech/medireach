import type { Metadata } from "next";
import { CreditCard, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/admin/FormDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { ListToolbar, Pagination } from "@/components/admin/ListControls";
import { rolesFor } from "@/components/admin/nav";
import { requireAdminPage } from "@/lib/auth/admin";
import { pageOf, PAGE_SIZE, type SearchParams } from "@/lib/admin/list";
import { PAYMENT_MODE_LABEL, PAYMENT_PURPOSE_LABEL } from "@/lib/admin/labels";
import { paymentFilter } from "@/lib/admin/payments";
import { PAYMENT_MODES, PAYMENT_PURPOSES } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { formatDate, formatINR, monthLabel, startOfMonthIST } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Hospital } from "@/models/Hospital";
import { Payment } from "@/models/Payment";
import { deletePaymentAction } from "./actions";
import { PaymentDialog } from "./PaymentDialog";

export const metadata: Metadata = { title: "Payments" };

const GST_NOTE = { inclusive: "Prices include GST", exclusive: "Prices exclude GST", none: "GST not applicable" } as const;

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const admin = await requireAdminPage(rolesFor("/admin/payments"));
  await connectToDatabase();
  const sp = await searchParams;
  const { filter } = paymentFilter(sp);
  const page = pageOf(sp);
  const sixMonthsAgo = startOfMonthIST(5);

  const [settings, total, payments, sum, monthly, doctors, hospitals] = await Promise.all([
    getSettings(),
    Payment.countDocuments(filter),
    Payment.find(filter).sort({ date: -1, createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
    Payment.aggregate<{ amount: number; n: number }>([{ $match: filter }, { $group: { _id: null, amount: { $sum: "$amount" }, n: { $sum: 1 } } }]),
    Payment.aggregate<{ _id: string; amount: number; n: number }>([
      { $match: { date: { $gte: sixMonthsAgo } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date", timezone: "Asia/Kolkata" } }, amount: { $sum: "$amount" }, n: { $sum: 1 } } },
    ]),
    DoctorProfile.find().select({ title: 1, firstName: 1, lastName: 1, displayName: 1 }).sort({ firstName: 1 }).lean(),
    Hospital.find().select({ name: 1 }).sort({ name: 1 }).lean(),
  ]);

  const doctorName = new Map(doctors.map((d) => [String(d._id), d.displayName || `${d.title || "Dr."} ${d.firstName} ${d.lastName}`]));
  const hospitalName = new Map(hospitals.map((h) => [String(h._id), h.name]));
  const months = Array.from({ length: 6 }, (_, i) => {
    const start = startOfMonthIST(5 - i);
    const key = new Date(start.getTime() + 5.5 * 3600_000).toISOString().slice(0, 7);
    const m = monthly.find((x) => x._id === key);
    return { key, label: monthLabel(new Date(start.getTime() + 6 * 3600_000)), amount: m?.amount ?? 0, n: m?.n ?? 0 };
  });
  const exportHref = `/admin/payments/export?${new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string")).toString()}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground">{GST_NOTE[settings.gstMode]} (change in Settings).</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href={exportHref}>
              <Download /> Export CSV
            </a>
          </Button>
          <PaymentDialog
            doctors={doctors.map((d) => ({ id: String(d._id), name: doctorName.get(String(d._id))! }))}
            hospitals={hospitals.map((h) => ({ id: String(h._id), name: h.name }))}
            defaultDoctorId={typeof sp.doctor === "string" ? sp.doctor : undefined}
            gstIncludedDefault={settings.gstMode !== "exclusive"}
          />
        </div>
      </div>

      <section aria-label="Monthly totals" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {months.map((m, i) => (
          <a
            key={m.key}
            href={`/admin/payments?month=${m.key}`}
            className={`rounded-xl border bg-card p-3 shadow-soft hover:border-ink/30 ${sp.month === m.key ? "border-ink" : "border-line"}`}
          >
            <p className="text-xs text-muted-foreground">
              {m.label}
              {i === 5 ? " (this month)" : ""}
            </p>
            <p className="font-display text-xl font-semibold text-ink">{formatINR(m.amount)}</p>
            <p className="text-xs text-muted-foreground">
              {m.n} payment{m.n === 1 ? "" : "s"}
            </p>
          </a>
        ))}
      </section>

      <ListToolbar
        search={false}
        filters={[
          { name: "month", label: "Month", options: months.map((m) => ({ value: m.key, label: m.label })).reverse() },
          { name: "mode", label: "Mode", options: PAYMENT_MODES.map((m) => ({ value: m, label: PAYMENT_MODE_LABEL[m] })) },
          { name: "purpose", label: "Purpose", options: PAYMENT_PURPOSES.map((m) => ({ value: m, label: PAYMENT_PURPOSE_LABEL[m] })) },
          { name: "doctor", label: "Doctor", options: doctors.map((d) => ({ value: String(d._id), label: doctorName.get(String(d._id))! })) },
        ]}
      />

      <p className="text-sm">
        <span className="text-muted-foreground">Total for these filters: </span>
        <span className="font-display text-lg font-semibold text-ink">{formatINR(sum[0]?.amount ?? 0)}</span>
        <span className="text-muted-foreground"> · {sum[0]?.n ?? 0} payments</span>
      </p>

      {payments.length === 0 ? (
        <EmptyState icon={CreditCard} title="No payments here" description="Recorded payments appear here with monthly totals." />
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-card shadow-soft">
          {payments.map((p) => (
            <li key={String(p._id)} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink">
                  {p.doctorId ? doctorName.get(String(p.doctorId)) : hospitalName.get(String(p.hospitalId)) ?? "—"}
                </span>
                <span className="text-sm text-muted-foreground">
                  {[formatDate(p.date), PAYMENT_PURPOSE_LABEL[p.purpose], PAYMENT_MODE_LABEL[p.mode], p.invoiceNo].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="text-right">
                <span className="block font-display text-lg font-semibold text-ink">{formatINR(p.amount)}</span>
                <span className="text-xs text-muted-foreground">{p.gstIncluded ? "incl. GST" : "excl. GST"}</span>
              </span>
              {admin.role === "superadmin" && (
                <ConfirmButton
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label="Delete payment" className="text-clay">
                      <Trash2 />
                    </Button>
                  }
                  title="Delete this payment?"
                  description="This removes the record permanently. The deletion is kept in the audit log."
                  confirmLabel="Delete"
                  successMessage="Payment deleted"
                  onConfirm={async () => {
                    "use server";
                    return deletePaymentAction({ id: String(p._id) });
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PAGE_SIZE)} total={total} />
    </div>
  );
}
