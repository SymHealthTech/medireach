import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus, UserRound } from "lucide-react";
import type { FilterQuery } from "mongoose";
import { EmptyState } from "@/components/admin/EmptyState";
import { ListToolbar, Pagination } from "@/components/admin/ListControls";
import { DoctorRowActions } from "@/components/admin/DoctorRowActions";
import { FoundingBadge, StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { rolesFor } from "@/components/admin/nav";
import { can, requireAdminPage } from "@/lib/auth/admin";
import { isObjectId, oneOf, pageOf, PAGE_SIZE, param, searchRegex, type SearchParams } from "@/lib/admin/list";
import { DOCTOR_PLANS, DOCTOR_SOURCES, DOCTOR_STATUSES } from "@/lib/constants";
import { DOCTOR_PLAN_LABEL } from "@/lib/admin/labels";
import { getEditorOptions } from "@/lib/doctors/options";
import { timeAgo } from "@/lib/format";
import { absUrl, paths, subdomainUrl } from "@/lib/site";
import { DoctorProfile, type DoctorProfileDoc } from "@/models/DoctorProfile";

export const metadata: Metadata = { title: "Doctors" };

const SORTS = { updated: { updatedAt: -1 }, name: { firstName: 1, lastName: 1 }, created: { createdAt: -1 }, published: { publishedAt: -1 } } as const;

export default async function DoctorsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const admin = await requireAdminPage(rolesFor("/admin/doctors"));
  const sp = await searchParams;
  const options = await getEditorOptions();

  const filter: FilterQuery<DoctorProfileDoc> = {};
  const status = oneOf(param(sp, "status"), DOCTOR_STATUSES);
  if (status) filter.status = status;
  const plan = oneOf(param(sp, "plan"), DOCTOR_PLANS);
  if (plan) filter.plan = plan;
  const source = oneOf(param(sp, "source"), DOCTOR_SOURCES);
  if (source) filter.source = source;
  const founding = oneOf(param(sp, "founding"), ["yes", "no"] as const);
  if (founding) filter.founding = founding === "yes" ? true : { $ne: true };
  const city = param(sp, "city");
  if (isObjectId(city)) filter["clinics.cityId"] = city;
  const area = param(sp, "area");
  if (isObjectId(area)) filter["clinics.areaId"] = area;
  const specialty = param(sp, "specialty");
  if (isObjectId(specialty)) filter.$or = [{ primarySpecialtyId: specialty }, { secondarySpecialtyIds: specialty }];
  const re = searchRegex(param(sp, "q"));
  if (re) {
    const or = [{ firstName: re }, { lastName: re }, { displayName: re }, { slug: re }, { mobile: re }, { "clinics.name": re }];
    filter.$and = [...(filter.$or ? [{ $or: filter.$or }] : []), { $or: or }];
    delete filter.$or;
  }
  const sortKey = oneOf(param(sp, "sort"), Object.keys(SORTS) as (keyof typeof SORTS)[]) ?? "updated";
  const page = pageOf(sp);

  const [total, docs] = await Promise.all([
    DoctorProfile.countDocuments(filter),
    DoctorProfile.find(filter)
      .sort(SORTS[sortKey])
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .select({ title: 1, firstName: 1, lastName: 1, displayName: 1, status: 1, photo: 1, primarySpecialtyId: 1, clinics: { $slice: 1 }, slug: 1, citySlug: 1, shortSlug: 1, subdomain: 1, founding: 1, foundingNumber: 1, updatedAt: 1, plan: 1, "compliance.issues": 1 })
      .lean(),
  ]);

  const specName = new Map(options.specialties.map((s) => [s.id, s.name]));
  const areaName = new Map(options.areas.map((a) => [a.id, a.name]));
  const rows = docs.map((d) => {
    const name = d.displayName || `${d.title || "Dr."} ${d.firstName} ${d.lastName}`;
    const live = d.status === "published" && d.slug && d.citySlug;
    return {
      id: String(d._id),
      name,
      status: d.status,
      photo: d.photo?.url,
      meta: [specName.get(String(d.primarySpecialtyId)), areaName.get(String(d.clinics[0]?.areaId))].filter(Boolean).join(" · "),
      founding: d.founding ? (d.foundingNumber ?? 0) : null,
      issues: d.compliance?.issues?.length ?? 0,
      updatedAt: d.updatedAt,
      plan: d.plan,
      liveUrl: live ? absUrl(paths.doctor(d.citySlug!, d.slug!)) : undefined,
      shareUrl: live ? (d.subdomain ? subdomainUrl(d.subdomain) : d.shortSlug ? absUrl(paths.short(d.shortSlug)) : undefined) : undefined,
    };
  });
  const canPublish = can.publish(admin.role);
  const filtered = Object.keys(filter).length > 0;
  const cityId = isObjectId(city) ? city : options.cities.find((c) => c.slug === "pune")?.id;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground">Every doctor profile, from first draft to published page.</p>
        <Button asChild className="md:hidden">
          <Link href="/admin/doctors/new">
            <Plus /> New doctor
          </Link>
        </Button>
      </div>

      <ListToolbar
        placeholder="Search name, mobile, clinic…"
        filters={[
          { name: "status", label: "Status", options: DOCTOR_STATUSES.map((s) => ({ value: s, label: s === "review" ? "In review" : s[0]!.toUpperCase() + s.slice(1) })) },
          { name: "specialty", label: "Specialty", options: options.specialties.map((s) => ({ value: s.id, label: s.name })) },
          { name: "city", label: "City", options: options.cities.map((c) => ({ value: c.id, label: c.name })) },
          { name: "area", label: "Area", options: options.areas.filter((a) => a.cityId === cityId).map((a) => ({ value: a.id, label: a.name })) },
          { name: "plan", label: "Plan", options: DOCTOR_PLANS.map((p) => ({ value: p, label: DOCTOR_PLAN_LABEL[p] })) },
          { name: "founding", label: "Founding", options: [{ value: "yes", label: "Founding only" }, { value: "no", label: "Not founding" }] },
          { name: "source", label: "Source", options: DOCTOR_SOURCES.map((s) => ({ value: s, label: s[0]!.toUpperCase() + s.slice(1) })) },
        ]}
        sorts={[
          { value: "updated", label: "Last updated" },
          { value: "name", label: "Name" },
          { value: "created", label: "Newest" },
          { value: "published", label: "Recently published" },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title={filtered ? "No doctors match these filters" : "No doctors yet"}
          description={filtered ? "Try clearing a filter or the search." : "Add your first doctor to start building their page and visiting card."}
          action={filtered ? undefined : { label: "New doctor", href: "/admin/doctors/new" }}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-line bg-card shadow-soft md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Doctor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Plan</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="w-12 px-2 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="h-[52px] border-t border-line hover:bg-accent/40">
                    <td className="px-4 py-2">
                      <Link href={`/admin/doctors/${r.id}`} className="flex items-center gap-3">
                        <Thumb src={r.photo} name={r.name} />
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 font-semibold text-ink">
                            <span className="truncate">{r.name}</span>
                            {r.founding !== null && <FoundingBadge number={r.founding || undefined} />}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">{r.meta || "—"}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={r.status} />
                        {r.issues > 0 && <span className="text-xs font-semibold text-clay-text">{r.issues} issue{r.issues > 1 ? "s" : ""}</span>}
                      </div>
                    </td>
                    <td className="hidden px-4 py-2 text-muted-foreground lg:table-cell">{r.plan === "doctor_addon" ? "Add-on" : "Doctor"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{timeAgo(r.updatedAt)}</td>
                    <td className="px-2 py-2">
                      <DoctorRowActions doctor={r} canPublish={canPublish} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-2 md:hidden">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded-xl border border-line bg-card p-3 shadow-soft">
                <Link href={`/admin/doctors/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Thumb src={r.photo} name={r.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{r.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.meta || "—"}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={r.status} />
                      {r.founding !== null && <FoundingBadge number={r.founding || undefined} />}
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </Link>
                <DoctorRowActions doctor={r} canPublish={canPublish} />
              </li>
            ))}
          </ul>
        </>
      )}

      <Pagination page={page} pageCount={Math.ceil(total / PAGE_SIZE)} total={total} />
    </div>
  );
}

function Thumb({ src, name }: { src?: string; name: string }) {
  const initials = name.replace(/^Dr\.?\s+/i, "").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
    <img src={src} alt="" className="size-10 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sage text-xs font-semibold text-ink">{initials}</span>
  );
}
