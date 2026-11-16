import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, Globe } from "lucide-react";
import type { FilterQuery } from "mongoose";
import { EmptyState } from "@/components/admin/EmptyState";
import { ListToolbar, Pagination } from "@/components/admin/ListControls";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { rolesFor } from "@/components/admin/nav";
import { requireAdminPage } from "@/lib/auth/admin";
import { oneOf, pageOf, PAGE_SIZE, param, searchRegex, type SearchParams } from "@/lib/admin/list";
import { SEO_HEALTH_SELECT, seoHealth } from "@/lib/admin/seo-health";
import { DOCTOR_STATUSES } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { absUrl, paths, subdomainUrl } from "@/lib/site";
import { DoctorProfile, type DoctorProfileDoc } from "@/models/DoctorProfile";
import { TemplateSlot } from "@/models/TemplateSlot";

export const metadata: Metadata = { title: "Portfolio pages" };

export default async function PortfolioPagesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage(rolesFor("/admin/pages"));
  await connectToDatabase();
  const sp = await searchParams;

  const filter: FilterQuery<DoctorProfileDoc> = {};
  const status = oneOf(param(sp, "status"), DOCTOR_STATUSES);
  if (status) filter.status = status;
  const re = searchRegex(param(sp, "q"));
  if (re) filter.$or = [{ firstName: re }, { lastName: re }, { slug: re }, { shortSlug: re }, { subdomain: re }];
  const health = oneOf(param(sp, "health"), ["needs-work", "ok"] as const);
  const page = pageOf(sp);

  const [total, docs, slots] = await Promise.all([
    DoctorProfile.countDocuments(filter),
    DoctorProfile.find(filter)
      .sort({ updatedAt: -1 })
      // The health filter is computed in code, so it scans up to 500 pages without paging.
      .skip(health ? 0 : (page - 1) * PAGE_SIZE)
      .limit(health ? 500 : PAGE_SIZE)
      .select({ title: 1, firstName: 1, lastName: 1, displayName: 1, status: 1, slug: 1, citySlug: 1, shortSlug: 1, subdomain: 1, portfolioTemplateId: 1, updatedAt: 1, ...SEO_HEALTH_SELECT })
      .lean(),
    TemplateSlot.find({ type: "portfolio" }).select({ key: 1, name: 1 }).lean(),
  ]);
  const templateName = new Map(slots.map((s) => [s.key, s.name]));
  const rows = docs
    .map((d) => ({ d, h: seoHealth(d) }))
    .filter(({ h }) => (health === "needs-work" ? h.missing.length + h.issues > 0 : health === "ok" ? h.missing.length + h.issues === 0 : true));

  return (
    <div className="space-y-5">
      <p className="text-muted-foreground">Every portfolio page with its address, short link, design and SEO health.</p>
      <ListToolbar
        placeholder="Search name or address…"
        filters={[
          { name: "status", label: "Status", options: DOCTOR_STATUSES.map((s) => ({ value: s, label: s === "review" ? "In review" : s[0]!.toUpperCase() + s.slice(1) })) },
          { name: "health", label: "SEO health", options: [{ value: "needs-work", label: "Needs work" }, { value: "ok", label: "All good" }] },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState icon={Globe} title="No pages here" description="Pages appear once a doctor profile is created." action={{ label: "New doctor", href: "/admin/doctors/new" }} />
      ) : (
        <ul className="space-y-3">
          {rows.map(({ d, h }) => {
            const canonical = d.slug && d.citySlug ? absUrl(paths.doctor(d.citySlug, d.slug)) : undefined;
            const live = d.status === "published" && canonical;
            return (
              <li key={String(d._id)} className="rounded-xl border border-line bg-card p-4 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/doctors/${d._id}`} className="font-semibold text-ink hover:underline">
                        {d.displayName || `${d.title || "Dr."} ${d.firstName} ${d.lastName}`}
                      </Link>
                      <StatusBadge status={d.status} />
                      {h.noindex && <span className="text-xs font-medium text-muted-foreground">noindex</span>}
                    </p>
                    <p className="break-all text-sm text-muted-foreground">{canonical ?? "Address not set yet"}</p>
                    <p className="text-xs text-muted-foreground">
                      {[
                        d.shortSlug && `Short: /${d.shortSlug}`,
                        d.subdomain && `Site: ${subdomainUrl(d.subdomain).replace(/^https?:\/\//, "")}`,
                        `Design: ${templateName.get(d.portfolioTemplateId) ?? d.portfolioTemplateId}`,
                        `Updated ${timeAgo(d.updatedAt)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {live && (
                    <a href={canonical} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm font-medium text-ink hover:underline">
                      View live <ExternalLink className="size-4" />
                    </a>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {h.missing.length === 0 && h.issues === 0 ? (
                    <span className="inline-flex items-center gap-1 font-medium text-leaf-text">
                      <CheckCircle2 className="size-4" /> SEO looks good
                    </span>
                  ) : (
                    <>
                      <AlertTriangle className="size-4 text-marigold" />
                      {h.issues > 0 && <span className="rounded-full bg-clay/15 px-2 py-0.5 font-semibold text-clay-text">{h.issues} compliance issue{h.issues > 1 ? "s" : ""}</span>}
                      {h.missing.map((m) => (
                        <span key={m} className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                          Missing {m.toLowerCase()}
                        </span>
                      ))}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {health ? (
        <p className="text-sm text-muted-foreground">{rows.length} matching</p>
      ) : (
        <Pagination page={page} pageCount={Math.ceil(total / PAGE_SIZE)} total={total} />
      )}
    </div>
  );
}
