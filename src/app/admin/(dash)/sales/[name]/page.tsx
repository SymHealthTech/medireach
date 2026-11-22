import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Briefcase } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { rolesFor } from "@/components/admin/nav";
import { requireAdminPage } from "@/lib/auth/admin";
import { formatDate, formatINR } from "@/lib/format";
import { findSalesExecutive, isSameExecutive, salesBusiness, type SalesItem } from "@/lib/sales/server";

export const metadata: Metadata = { title: "Sales executive" };

const KIND_LABEL: Record<SalesItem["kind"], string> = { doctor: "Doctor", clinic: "Clinic", hospital: "Hospital" };

/** All business done by one sales executive: their doctors, clinics and hospitals, with payments. */
export default async function SalesExecutivePage({ params }: { params: Promise<{ name: string }> }) {
  const admin = await requireAdminPage(rolesFor("/admin/sales"));
  const raw = decodeURIComponent((await params).name);
  // Sales users only see their own business.
  const own = admin.role === "sales";
  if (own && !isSameExecutive(raw, admin.name)) redirect(`/admin/sales/${encodeURIComponent(admin.name)}`);
  const name = await findSalesExecutive(raw);
  if (!name) notFound();
  const items = await salesBusiness(name);

  const count = (k: SalesItem["kind"]) => items.filter((i) => i.kind === k).length;
  const collected = items.reduce((n, i) => n + i.collected, 0);
  const live = items.filter((i) => i.status === "published").length;
  const staffId = items.find((i) => i.staffId)?.staffId;
  const stats = [
    { label: "Doctors", value: String(count("doctor")) },
    { label: "Clinics", value: String(count("clinic")) },
    { label: "Hospitals", value: String(count("hospital")) },
    { label: "Live", value: String(live) },
    { label: "Payments recorded", value: formatINR(collected) },
  ];

  return (
    <div className="space-y-5">
      {!own && (
        <Link href="/admin/sales" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-ink">
          <ArrowLeft className="size-4" /> All sales executives
        </Link>
      )}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-display text-2xl font-semibold text-ink">{name}</h2>
        {staffId && <span className="text-sm text-muted-foreground">ID {staffId}</span>}
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-card p-4 shadow-soft">
            <dt className="text-xs font-medium text-muted-foreground">{s.label}</dt>
            <dd className="mt-1 font-display text-xl font-semibold tabular-nums text-ink">{s.value}</dd>
          </div>
        ))}
      </dl>

      {items.length === 0 ? (
        <EmptyState icon={Briefcase} title="No business yet" description={`Nothing is recorded under ${name} yet. Pick them as the sales executive on a Review step.`} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-line bg-card shadow-soft md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Added</th>
                  <th className="px-4 py-3">Setup paid</th>
                  <th className="px-4 py-3">Renewal due</th>
                  <th className="px-4 py-3 text-right">Payments</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="h-[52px] border-t border-line hover:bg-accent/40">
                    <td className="px-4 py-2">
                      <Link href={i.href} className="font-semibold text-ink hover:underline">
                        {i.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{KIND_LABEL[i.kind]}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={i.status} />
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{formatDate(i.createdAt)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{formatDate(i.setupPaidAt)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{formatDate(i.renewalDueDate)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatINR(i.collected)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-2 md:hidden">
            {items.map((i) => (
              <li key={i.id}>
                <Link href={i.href} className="block rounded-xl border border-line bg-card p-3 shadow-soft">
                  <span className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-semibold text-ink">{i.name}</span>
                    <StatusBadge status={i.status} />
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {KIND_LABEL[i.kind]} · added {formatDate(i.createdAt)} · {formatINR(i.collected)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
