import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import type { FilterQuery } from "mongoose";
import { EmptyState } from "@/components/admin/EmptyState";
import { ListToolbar, Pagination } from "@/components/admin/ListControls";
import { Pill } from "@/components/admin/StatusBadge";
import { rolesFor } from "@/components/admin/nav";
import { requireAdminPage } from "@/lib/auth/admin";
import { isSales, leadScope } from "@/lib/admin/scope";
import { oneOf, pageOf, PAGE_SIZE, param, searchRegex, type SearchParams } from "@/lib/admin/list";
import { LEAD_SOURCES, LEAD_STATUSES } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Lead, type LeadDoc } from "@/models/Lead";
import { LEAD_SOURCE_LABEL, LEAD_STATUS_LABEL } from "@/lib/admin/labels";
import { LeadActions, NewLeadButton, type LeadRow } from "./LeadControls";

export const metadata: Metadata = { title: "Leads" };

const TONE = { new: "marigold", contacted: "ink", won: "leaf", lost: "muted" } as const;

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const admin = await requireAdminPage(rolesFor("/admin/leads"));
  // Sales executives see only the leads they added.
  const scope = leadScope(admin);
  await connectToDatabase();
  const sp = await searchParams;

  const filter: FilterQuery<LeadDoc> = { ...scope };
  const status = oneOf(param(sp, "status"), LEAD_STATUSES);
  if (status) filter.status = status;
  const source = oneOf(param(sp, "source"), LEAD_SOURCES);
  // WhatsApp-click beacons carry no contact details; show them only when asked for.
  filter.source = source ?? { $ne: "whatsapp_click" };
  const re = searchRegex(param(sp, "q"));
  if (re) filter.$or = [{ name: re }, { phone: re }, { city: re }, { specialty: re }, { message: re }];
  const page = pageOf(sp);

  const [total, leads, counts] = await Promise.all([
    Lead.countDocuments(filter),
    Lead.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
    Lead.aggregate<{ _id: string; n: number }>([{ $match: { ...scope, source: { $ne: "whatsapp_click" } } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);
  const waClicks = isSales(admin) ? 0 : await Lead.countDocuments({ source: "whatsapp_click", createdAt: { $gte: new Date(Date.now() - 30 * 86400_000) } });
  const countOf = (s: string) => counts.find((c) => c._id === s)?.n ?? 0;
  const statusHref = (s?: string) => {
    const next = new URLSearchParams();
    if (s) next.set("status", s);
    if (param(sp, "q")) next.set("q", param(sp, "q")!);
    return `/admin/leads?${next.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {isSales(admin) ? (
          <p className="text-muted-foreground">The leads you added from field visits and calls.</p>
        ) : (
          <p className="text-muted-foreground">
            Enquiries from the website and field visits. WhatsApp button taps in the last 30 days:{" "}
            <Link href="/admin/leads?source=whatsapp_click" className="font-semibold text-ink underline">
              {waClicks}
            </Link>
          </p>
        )}
        <NewLeadButton />
      </div>

      {/* Pipeline */}
      <nav aria-label="Lead pipeline" className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        <Link
          href={statusHref()}
          className={cn("shrink-0 rounded-xl border px-4 py-2.5 text-sm", !status ? "border-ink bg-card font-semibold" : "border-line bg-card text-muted-foreground")}
        >
          All <span className="ml-1 font-display text-lg">{counts.reduce((a, c) => a + c.n, 0)}</span>
        </Link>
        {LEAD_STATUSES.map((s) => (
          <Link
            key={s}
            href={statusHref(s)}
            className={cn("shrink-0 rounded-xl border px-4 py-2.5 text-sm", status === s ? "border-ink bg-card font-semibold" : "border-line bg-card text-muted-foreground")}
          >
            {LEAD_STATUS_LABEL[s]} <span className="ml-1 font-display text-lg text-ink">{countOf(s)}</span>
          </Link>
        ))}
      </nav>

      <ListToolbar
        placeholder="Search name, phone, city…"
        filters={[{ name: "source", label: "Source", options: LEAD_SOURCES.map((s) => ({ value: s, label: LEAD_SOURCE_LABEL[s] })) }]}
      />

      {leads.length === 0 ? (
        <EmptyState icon={Users} title={re || status || source ? "No leads match" : "No leads yet"} description="Website enquiries and WhatsApp clicks appear here automatically." />
      ) : (
        <ul className="space-y-3">
          {leads.map((l) => {
            const row: LeadRow = {
              id: String(l._id),
              name: l.name,
              phone: l.phone,
              city: l.city,
              specialty: l.specialty,
              message: l.message,
              source: l.source,
              status: l.status,
            };
            return (
              <li key={row.id} className="rounded-xl border border-line bg-card p-4 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                      {row.name} <Pill tone={TONE[row.status]}>{LEAD_STATUS_LABEL[row.status]}</Pill>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[row.phone, row.specialty, row.city, LEAD_SOURCE_LABEL[row.source], formatDateTime(l.createdAt)].filter(Boolean).join(" · ")}
                    </p>
                    {row.message && <p className="mt-2 max-w-2xl text-sm text-body">{row.message}</p>}
                  </div>
                  <LeadActions lead={row} waText={`Hello ${row.name.split(" ")[0]}, this is MediReach. Thanks for your interest in a doctor page.`} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PAGE_SIZE)} total={total} />
    </div>
  );
}
