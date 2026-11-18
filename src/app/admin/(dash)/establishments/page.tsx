import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ChevronRight, CreditCard, Plus, UserPlus } from "lucide-react";
import type { FilterQuery } from "mongoose";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/EmptyState";
import { ListToolbar, Pagination } from "@/components/admin/ListControls";
import { FoundingBadge, Pill, StatusBadge } from "@/components/admin/StatusBadge";
import { rolesFor } from "@/components/admin/nav";
import { can, requireAdminPage } from "@/lib/auth/admin";
import { isObjectId, oneOf, pageOf, PAGE_SIZE, param, searchRegex, type SearchParams } from "@/lib/admin/list";
import { RENEWAL_STATUS_LABEL, RENEWAL_STATUS_TONE } from "@/lib/admin/labels";
import { DOCTOR_STATUSES, ESTABLISHMENT_KINDS, RENEWAL_STATUSES } from "@/lib/constants";
import { getEstablishmentEditorOptions } from "@/lib/establishments/options";
import { timeAgo } from "@/lib/format";
import { displayRenewalStatus } from "@/lib/renewals";
import { Establishment, type EstablishmentDoc } from "@/models/Establishment";
import { getTheme } from "@/themes/specialty";

export const metadata: Metadata = { title: "Clinics & hospitals" };

const SORTS = { updated: { updatedAt: -1 }, name: { name: 1 }, created: { createdAt: -1 } } as const;

export default async function EstablishmentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const admin = await requireAdminPage(rolesFor("/admin/establishments"));
  const sp = await searchParams;
  const options = await getEstablishmentEditorOptions();

  const filter: FilterQuery<EstablishmentDoc> = {};
  const kind = oneOf(param(sp, "kind"), ESTABLISHMENT_KINDS);
  if (kind) filter.kind = kind;
  const status = oneOf(param(sp, "status"), DOCTOR_STATUSES);
  if (status) filter.status = status;
  const category = param(sp, "category");
  if (isObjectId(category)) filter.categoryId = category;
  const area = param(sp, "area");
  if (isObjectId(area)) filter["address.areaId"] = area;
  const re = searchRegex(param(sp, "q"));
  if (re) filter.$or = [{ name: re }, { slug: re }, { "contact.phones": re }, { "contactPerson.name": re }];
  const renewal = oneOf(param(sp, "renewal"), RENEWAL_STATUSES);
  const sortKey = oneOf(param(sp, "sort"), Object.keys(SORTS) as (keyof typeof SORTS)[]) ?? "updated";
  const page = pageOf(sp);

  // Renewal status is worked out live (see Payments & renewals), so filter on it after the query.
  const docs = await Establishment.find(filter)
    .sort(SORTS[sortKey])
    .select({ name: 1, kind: 1, status: 1, categoryId: 1, themeKey: 1, logo: 1, address: 1, founding: 1, foundingNumber: 1, renewalDueDate: 1, renewalStatus: 1, doctors: 1, updatedAt: 1, "compliance.issues": 1 })
    .limit(5000)
    .lean();
  const now = new Date();
  const all = docs
    .map((d) => ({ d, renewal: displayRenewalStatus(d.renewalStatus, d.renewalDueDate, now) }))
    .filter((x) => !renewal || x.renewal === renewal);
  const total = all.length;

  const catName = new Map(options.categories.map((c) => [c.id, c.name]));
  const areaName = new Map(options.areas.map((a) => [a.id, a.name]));
  const rows = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(({ d, renewal: r }) => ({
    id: String(d._id),
    name: d.name,
    kind: d.kind,
    status: d.status,
    logo: d.logo?.url,
    color: getTheme(d.themeKey, d.kind).palette.primary,
    meta: [catName.get(String(d.categoryId)), areaName.get(String(d.address?.areaId))].filter(Boolean).join(" · "),
    founding: d.founding ? (d.foundingNumber ?? 0) : null,
    doctors: d.doctors?.length ?? 0,
    issues: d.compliance?.issues?.length ?? 0,
    renewal: r,
    hasDue: Boolean(d.renewalDueDate),
    updatedAt: d.updatedAt,
  }));
  const filtered = Object.keys(filter).length > 0 || Boolean(renewal);
  const pune = options.cities.find((c) => c.slug === "pune")?.id;
  const showMoney = can.seePaymentTotals(admin.role);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground">Clinic websites and small hospital websites (up to 10 beds).</p>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/establishments/new?kind=hospital">
              <Plus /> New hospital
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/establishments/new?kind=clinic">
              <Plus /> New clinic
            </Link>
          </Button>
        </div>
      </div>

      <ListToolbar
        placeholder="Search name, phone, contact person…"
        filters={[
          { name: "kind", label: "Type", options: [{ value: "clinic", label: "Clinics" }, { value: "hospital", label: "Hospitals" }] },
          { name: "category", label: "Category", options: options.categories.map((c) => ({ value: c.id, label: c.name })) },
          { name: "area", label: "Area", options: options.areas.filter((a) => a.cityId === pune).map((a) => ({ value: a.id, label: a.name })) },
          { name: "status", label: "Status", options: DOCTOR_STATUSES.map((s) => ({ value: s, label: s === "review" ? "In review" : s[0]!.toUpperCase() + s.slice(1) })) },
          { name: "renewal", label: "Renewal", options: (["active", "due", "overdue", "lapsed"] as const).map((s) => ({ value: s, label: RENEWAL_STATUS_LABEL[s] })) },
        ]}
        sorts={[
          { value: "updated", label: "Last updated" },
          { value: "name", label: "Name" },
          { value: "created", label: "Newest" },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={filtered ? "Nothing matches these filters" : "No clinics or hospitals yet"}
          description={filtered ? "Try clearing a filter or the search." : "Add a clinic or a small hospital to build its website and visiting card."}
          action={filtered ? undefined : { label: "New clinic", href: "/admin/establishments/new?kind=clinic" }}
        />
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-card shadow-soft">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center">
              <Link href={`/admin/establishments/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                {r.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
                  <img src={r.logo} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: r.color }}>
                    <Building2 className="size-5" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                    <span className="truncate">{r.name}</span>
                    {r.founding !== null && <FoundingBadge number={r.founding || undefined} />}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[r.kind === "hospital" ? "Hospital" : "Clinic", r.meta, `${r.doctors} doctor${r.doctors === 1 ? "" : "s"}`, `updated ${timeAgo(r.updatedAt)}`].filter(Boolean).join(" · ")}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={r.status} />
                    {r.hasDue && <Pill tone={RENEWAL_STATUS_TONE[r.renewal]}>{RENEWAL_STATUS_LABEL[r.renewal]}</Pill>}
                    {r.issues > 0 && <span className="text-xs font-semibold text-clay-text">{r.issues} issue{r.issues > 1 ? "s" : ""}</span>}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground md:hidden" />
              </Link>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/admin/doctors/new?establishment=${r.id}`}>
                    <UserPlus /> Add doctor portfolio
                  </Link>
                </Button>
                {showMoney && (
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/admin/payments?establishment=${r.id}`}>
                      <CreditCard /> Payments
                    </Link>
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PAGE_SIZE)} total={total} />
    </div>
  );
}
