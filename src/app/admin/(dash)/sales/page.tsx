import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { Pill } from "@/components/admin/StatusBadge";
import { rolesFor } from "@/components/admin/nav";
import { requireAdminPage } from "@/lib/auth/admin";
import { formatINR } from "@/lib/format";
import { salesSummary } from "@/lib/sales/server";
import { NewAdminUserButton } from "../settings/SettingsForms";

export const metadata: Metadata = { title: "Sales executives" };

/** Every sales executive and the business recorded under their name (set on each Review step). Sales users go to their own page. */
export default async function SalesPage() {
  const admin = await requireAdminPage(rolesFor("/admin/sales"));
  if (admin.role === "sales") redirect(`/admin/sales/${encodeURIComponent(admin.name)}`);
  const rows = await salesSummary();
  const href = (name: string) => `/admin/sales/${encodeURIComponent(name)}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-muted-foreground">
          Everyone who brings in business. A name typed as “Other” on a doctor, clinic or hospital is added here once saved. Open a name to see everything done by them.
          Sales executives with a dashboard login are managed in{" "}
          <Link href="/admin/settings#users" className="font-medium text-ink underline underline-offset-2">
            Settings → Dashboard users
          </Link>
          .
        </p>
        <NewAdminUserButton role="sales" label="Add sales executive" lockRole />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No sales executives yet" description="Pick or type a sales executive on the Review step of a doctor, clinic or hospital." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-line bg-card shadow-soft md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Sales executive</th>
                  <th className="px-4 py-3 text-right">Doctors</th>
                  <th className="px-4 py-3 text-right">Clinics</th>
                  <th className="px-4 py-3 text-right">Hospitals</th>
                  <th className="px-4 py-3 text-right">Live</th>
                  <th className="px-4 py-3 text-right">Payments</th>
                  <th className="w-10 px-2 py-3">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name} className="h-[52px] border-t border-line hover:bg-accent/40">
                    <td className="px-4 py-2">
                      <Link href={href(r.name)} className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                        {r.name}
                        {r.staffId && <span className="text-xs font-normal text-muted-foreground">{r.staffId}</span>}
                        {r.isUser && <Pill tone="muted">Dashboard user</Pill>}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.doctors}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.clinics}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.hospitals}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.published}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatINR(r.collected)}</td>
                    <td className="px-2 py-2">
                      <Link href={href(r.name)} aria-label={`Open ${r.name}`} className="flex size-8 items-center justify-center rounded-md hover:bg-accent">
                        <ChevronRight className="size-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-2 md:hidden">
            {rows.map((r) => (
              <li key={r.name}>
                <Link href={href(r.name)} className="flex items-center gap-3 rounded-xl border border-line bg-card p-3 shadow-soft">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{r.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {r.doctors} doctors · {r.clinics} clinics · {r.hospitals} hospitals · {formatINR(r.collected)}
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
