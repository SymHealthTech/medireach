import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, Globe } from "lucide-react";
import type { FilterQuery } from "mongoose";
import { EmptyState } from "@/components/admin/EmptyState";
import { ListToolbar, Pagination } from "@/components/admin/ListControls";
import { Pill, StatusBadge } from "@/components/admin/StatusBadge";
import { rolesFor } from "@/components/admin/nav";
import { requireAdminPage } from "@/lib/auth/admin";
import { oneOf, pageOf, PAGE_SIZE, param, searchRegex, type SearchParams } from "@/lib/admin/list";
import { SEO_HEALTH_SELECT, SITE_SEO_HEALTH_SELECT, seoHealth, siteSeoHealth } from "@/lib/admin/seo-health";
import { DOCTOR_STATUSES, PRODUCTS, type Product } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { absUrl, paths, sitePath, subdomainUrl } from "@/lib/site";
import { DoctorProfile, type DoctorProfileDoc } from "@/models/DoctorProfile";
import { Establishment, type EstablishmentDoc } from "@/models/Establishment";
import { TemplateSlot } from "@/models/TemplateSlot";

export const metadata: Metadata = { title: "Sites" };

const TYPE_LABEL: Record<Product, string> = { doctor: "Doctor portfolio", clinic: "Clinic", hospital: "Hospital" };
/** Scanned per collection before filtering and paging in code (health is computed, not stored). */
const MAX_ROWS = 2000;

interface Row {
  key: string;
  type: Product;
  name: string;
  status: string;
  editHref: string;
  canonical?: string;
  details: string[];
  updatedAt: Date;
  health: { missing: string[]; issues: number; noindex: boolean };
}

/**
 * Sites: every doctor portfolio, clinic site and hospital site with its
 * address, short link / subdomain, design and SEO health, newest first.
 */
export default async function SitesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage(rolesFor("/admin/pages"));
  await connectToDatabase();
  const sp = await searchParams;

  const type = oneOf(param(sp, "type"), PRODUCTS);
  const status = oneOf(param(sp, "status"), DOCTOR_STATUSES);
  const health = oneOf(param(sp, "health"), ["needs-work", "ok"] as const);
  const re = searchRegex(param(sp, "q"));
  const page = pageOf(sp);

  const doctorFilter: FilterQuery<DoctorProfileDoc> = {};
  const siteFilter: FilterQuery<EstablishmentDoc> = {};
  if (status) doctorFilter.status = siteFilter.status = status;
  if (re) {
    doctorFilter.$or = [{ firstName: re }, { lastName: re }, { slug: re }, { shortSlug: re }, { subdomain: re }];
    siteFilter.$or = [{ name: re }, { slug: re }, { shortSlug: re }, { subdomain: re }];
  }
  if (type === "clinic" || type === "hospital") siteFilter.kind = type;

  const [doctors, sites, slots] = await Promise.all([
    type && type !== "doctor"
      ? Promise.resolve([])
      : DoctorProfile.find(doctorFilter)
          .sort({ updatedAt: -1 })
          .limit(MAX_ROWS)
          .select({ title: 1, firstName: 1, lastName: 1, displayName: 1, status: 1, slug: 1, citySlug: 1, shortSlug: 1, subdomain: 1, portfolioTemplateId: 1, updatedAt: 1, ...SEO_HEALTH_SELECT })
          .lean(),
    type === "doctor"
      ? Promise.resolve([])
      : Establishment.find(siteFilter)
          .sort({ updatedAt: -1 })
          .limit(MAX_ROWS)
          .select({ kind: 1, name: 1, status: 1, slug: 1, citySlug: 1, subdomain: 1, siteTemplateId: 1, themeKey: 1, updatedAt: 1, ...SITE_SEO_HEALTH_SELECT })
          .lean(),
    TemplateSlot.find().select({ type: 1, key: 1, name: 1 }).lean(),
  ]);
  const designName = (t: string, key: string) => slots.find((s) => s.type === t && s.key === key)?.name ?? key;

  const rows: Row[] = [
    ...doctors.map((d): Row => ({
      key: `d-${d._id}`,
      type: "doctor",
      name: d.displayName || `${d.title || "Dr."} ${d.firstName} ${d.lastName}`,
      status: d.status,
      editHref: `/admin/doctors/${d._id}`,
      ...(d.slug && d.citySlug ? { canonical: absUrl(paths.doctor(d.citySlug, d.slug)) } : {}),
      details: [
        d.shortSlug ? `Short: /${d.shortSlug}` : "",
        d.subdomain ? `Site: ${subdomainUrl(d.subdomain).replace(/^https?:\/\//, "")}` : "",
        `Design: ${designName("portfolio", d.portfolioTemplateId)}`,
      ].filter(Boolean),
      updatedAt: d.updatedAt,
      health: seoHealth(d),
    })),
    ...sites.map((e): Row => ({
      key: `e-${e._id}`,
      type: e.kind,
      name: e.name,
      status: e.status,
      editHref: `/admin/establishments/${e._id}`,
      ...(e.slug && e.citySlug ? { canonical: absUrl(sitePath({ kind: e.kind, citySlug: e.citySlug, slug: e.slug })) } : {}),
      details: [
        e.subdomain ? `Site: ${subdomainUrl(e.subdomain).replace(/^https?:\/\//, "")}` : "",
        `Design: ${designName(e.kind, e.siteTemplateId)}`,
        `Theme: ${e.themeKey}`,
      ].filter(Boolean),
      updatedAt: e.updatedAt,
      health: siteSeoHealth(e),
    })),
  ]
    .filter((r) => {
      const problems = r.health.missing.length + r.health.issues;
      return health === "needs-work" ? problems > 0 : health === "ok" ? problems === 0 : true;
    })
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-5">
      <p className="text-muted-foreground">Every doctor portfolio, clinic site and hospital site with its address, design and SEO health.</p>
      <ListToolbar
        placeholder="Search name or address…"
        filters={[
          { name: "type", label: "Type", options: PRODUCTS.map((p) => ({ value: p, label: TYPE_LABEL[p] })) },
          { name: "status", label: "Status", options: DOCTOR_STATUSES.map((s) => ({ value: s, label: s === "review" ? "In review" : s[0]!.toUpperCase() + s.slice(1) })) },
          { name: "health", label: "SEO health", options: [{ value: "needs-work", label: "Needs work" }, { value: "ok", label: "All good" }] },
        ]}
      />
      {shown.length === 0 ? (
        <EmptyState icon={Globe} title="No sites here" description="Sites appear once a doctor, clinic or hospital is created." action={{ label: "New doctor", href: "/admin/doctors/new" }} />
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => {
            const live = r.status === "published" && r.canonical;
            return (
              <li key={r.key} className="rounded-xl border border-line bg-card p-4 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <Link href={r.editHref} className="font-semibold text-ink hover:underline">
                        {r.name}
                      </Link>
                      <Pill tone="muted">{TYPE_LABEL[r.type]}</Pill>
                      <StatusBadge status={r.status} />
                      {r.health.noindex && <span className="text-xs font-medium text-muted-foreground">noindex</span>}
                    </p>
                    <p className="break-all text-sm text-muted-foreground">{r.canonical ?? "Address not set yet"}</p>
                    <p className="text-xs text-muted-foreground">{[...r.details, `Updated ${timeAgo(r.updatedAt)}`].join(" · ")}</p>
                  </div>
                  {live && (
                    <a href={r.canonical} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm font-medium text-ink hover:underline">
                      View live <ExternalLink className="size-4" />
                    </a>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {r.health.missing.length === 0 && r.health.issues === 0 ? (
                    <span className="inline-flex items-center gap-1 font-medium text-leaf-text">
                      <CheckCircle2 className="size-4" /> SEO looks good
                    </span>
                  ) : (
                    <>
                      <AlertTriangle className="size-4 text-marigold" />
                      {r.health.issues > 0 && (
                        <span className="rounded-full bg-clay/15 px-2 py-0.5 font-semibold text-clay-text">
                          {r.health.issues} compliance issue{r.health.issues > 1 ? "s" : ""}
                        </span>
                      )}
                      {r.health.missing.map((m) => (
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
      <Pagination page={page} pageCount={Math.ceil(rows.length / PAGE_SIZE)} total={rows.length} />
    </div>
  );
}
