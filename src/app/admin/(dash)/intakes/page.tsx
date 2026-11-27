import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, FileText, ImageIcon } from "lucide-react";
import type { FilterQuery } from "mongoose";
import { EmptyState } from "@/components/admin/EmptyState";
import { KindTabs } from "@/components/admin/KindTabs";
import { ListToolbar, Pagination } from "@/components/admin/ListControls";
import { Pill, StatusBadge } from "@/components/admin/StatusBadge";
import { rolesFor } from "@/components/admin/nav";
import { requireAdminPage } from "@/lib/auth/admin";
import { intakeScope } from "@/lib/admin/scope";
import { salesTeamOptions } from "@/lib/admin/ownership";
import { oneOf, pageOf, PAGE_SIZE, param, searchRegex, type SearchParams } from "@/lib/admin/list";
import { INTAKE_STATUS_LABEL, INTAKE_STATUS_TONE } from "@/lib/admin/labels";
import { INTAKE_KINDS, INTAKE_STATUSES, type IntakeStatus } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { INTAKE_KIND_LABEL, allPhotos } from "@/lib/intake/form";
import { intakeSites, syncPublishedIntakes } from "@/lib/intake/site-status";
import { Intake, type IntakeDoc } from "@/models/Intake";

export const metadata: Metadata = { title: "Website forms" };

/** Forms doctors, clinics and hospitals filled in themselves from "Get started". */
export default async function IntakesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const admin = await requireAdminPage(rolesFor("/admin/intakes"));
  // Sales executives see only the forms made into their own websites.
  const scope = await intakeScope(admin);
  await connectToDatabase();
  const sp = await searchParams;

  const filter: FilterQuery<IntakeDoc> = { ...scope };
  const status = oneOf(param(sp, "status"), INTAKE_STATUSES);
  if (status) filter.status = status;
  // The three forms are separate lists (Doctor / Clinic / Hospital tabs), as on the website.
  const kind = oneOf(param(sp, "kind"), INTAKE_KINDS) ?? "doctor";
  filter.kind = kind;
  const re = searchRegex(param(sp, "q"));
  if (re) filter.$or = [{ name: re }, { email: re }, { phone: re }, { ref: re }];
  const page = pageOf(sp);
  // Forms whose website is already live count as done.
  await syncPublishedIntakes(kind);

  const [total, rows, counts, kindCounts] = await Promise.all([
    Intake.countDocuments(filter),
    Intake.find(filter)
      .sort({ submittedAt: -1, lastSavedAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .select({ "data.designDecision": 1, kind: 1, email: 1, ref: 1, status: 1, name: 1, phone: 1, photos: 1, convertedTo: 1, salesAdminId: 1, salesCandidates: 1, missingCount: 1, submittedAt: 1, updatedAfterSubmitAt: 1, lastSavedAt: 1 })
      .lean(),
    Intake.aggregate<{ _id: IntakeStatus; n: number }>([{ $match: { ...scope, kind } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
    Intake.aggregate<{ _id: string; n: number }>([{ $match: scope }, { $group: { _id: "$kind", n: { $sum: 1 } } }]),
  ]);
  const sites = await intakeSites(rows);
  // Super admin: whose form it is (matched visit / assigned).
  const execName = new Map(admin.role === "superadmin" ? (await salesTeamOptions()).map((t) => [t.id, t.name]) : []);
  const countOf = (s: string) => counts.find((c) => c._id === s)?.n ?? 0;
  const statusHref = (s?: string) => {
    const next = new URLSearchParams();
    if (s) next.set("status", s);
    next.set("kind", kind);
    if (param(sp, "q")) next.set("q", param(sp, "q")!);
    return `/admin/intakes?${next.toString()}`;
  };

  return (
    <div className="space-y-5">
      <p className="text-muted-foreground">
        Details sent by doctors, clinics and hospitals through <strong className="text-ink">Get started</strong> on the website. Open a form to create its website draft, then check the draft step by step (the form&apos;s answers are shown in each step) and publish it.
      </p>

      <KindTabs
        label="Form type"
        active={kind}
        counts={Object.fromEntries(INTAKE_KINDS.map((k) => [k, kindCounts.find((c) => c._id === k)?.n ?? 0]))}
        hrefFor={(k) => `/admin/intakes?kind=${k}`}
      />

      <nav aria-label="Form status" className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        <Link href={statusHref()} className={cn("shrink-0 rounded-xl border px-4 py-2.5 text-sm", !status ? "border-ink bg-card font-semibold" : "border-line bg-card text-muted-foreground")}>
          All <span className="ml-1 font-display text-lg">{counts.reduce((a, c) => a + c.n, 0)}</span>
        </Link>
        {INTAKE_STATUSES.map((s) => (
          <Link
            key={s}
            href={statusHref(s)}
            className={cn("shrink-0 rounded-xl border px-4 py-2.5 text-sm", status === s ? "border-ink bg-card font-semibold" : "border-line bg-card text-muted-foreground")}
          >
            {INTAKE_STATUS_LABEL[s]} <span className="ml-1 font-display text-lg text-ink">{countOf(s)}</span>
          </Link>
        ))}
      </nav>

      <ListToolbar placeholder="Search name, email, phone, ref…" />

      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={re || status ? "No forms match" : `No ${INTAKE_KIND_LABEL[kind].toLowerCase()} forms yet`}
          description={`When someone fills the ${INTAKE_KIND_LABEL[kind].toLowerCase()} form from Get started on the website, it appears here.`}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const nPhotos = allPhotos({ ...r.photos, gallery: r.photos?.gallery ?? [] }).length;
            const site = sites.get(String(r._id));
            const photo = site?.photo ?? r.photos?.profile?.url ?? r.photos?.logo?.url ?? r.photos?.cover?.url;
            const formHref = `/admin/intakes/${r._id}`;
            return (
              <li key={String(r._id)} className="relative rounded-xl border border-line bg-card p-4 shadow-soft hover:border-ink/30">
                {/* The row opens the website draft (checked step by step); "Form details" keeps contact, notes and status. */}
                <Link href={site?.href ?? formHref} className="flex items-start gap-3 after:absolute after:inset-0 after:rounded-xl" aria-label={`${r.name || r.email}: ${site ? "open website draft" : "open form"}`}>
                  <Thumb src={photo} name={r.name || r.email} />
                  <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                        {r.name || r.email}
                        <Pill tone={INTAKE_STATUS_TONE[r.status]}>{INTAKE_STATUS_LABEL[r.status]}</Pill>
                        {r.updatedAfterSubmitAt && r.status !== "draft" && <Pill tone="clay">Updated</Pill>}
                        {(r.data as { designDecision?: string } | undefined)?.designDecision === "discuss" && <Pill tone="ink">Design: talk first</Pill>}
                        {r.salesAdminId && execName.get(String(r.salesAdminId)) && <Pill tone="muted">Sales: {execName.get(String(r.salesAdminId))}</Pill>}
                        {!r.salesAdminId && (r.salesCandidates?.length ?? 0) > 1 && admin.role === "superadmin" && <Pill tone="marigold">Pick sales executive</Pill>}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {[r.ref, r.phone, r.email].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        {site ? (
                          <>
                            Website <StatusBadge status={site.status} />
                          </>
                        ) : (
                          "No website draft yet"
                        )}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground sm:text-right">
                      <p>{r.submittedAt ? `Sent ${formatDateTime(r.submittedAt)}` : `Saved ${formatDateTime(r.lastSavedAt)}`}</p>
                      <p className="flex items-center gap-3 sm:justify-end">
                        <span>{r.missingCount ? `${r.missingCount} required missing` : "All required filled"}</span>
                        <span className="inline-flex items-center gap-1">
                          <ImageIcon className="size-3.5" aria-hidden /> {nPhotos}
                          {r.photos?.viaWhatsapp ? " + WhatsApp" : ""}
                        </span>
                      </p>
                    </div>
                  </div>
                </Link>
                {site && (
                  <Link
                    href={formHref}
                    className="relative z-10 mt-2 ml-[52px] inline-flex items-center gap-1 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-ink hover:underline"
                  >
                    <FileText className="size-3.5" aria-hidden /> Form details, contact and notes
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PAGE_SIZE)} total={total} />
    </div>
  );
}

/** Small round profile photo (doctor) or logo (clinic, hospital); initials when there is none. */
function Thumb({ src, name }: { src?: string; name: string }) {
  const initials = name.replace(/^Dr\.?\s+/i, "").split(/[\s@]+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
    <img src={src.replace("/image/upload/", "/image/upload/c_fill,w_96,h_96,f_auto,q_auto/")} alt="" className="size-11 shrink-0 rounded-full border border-line object-cover" />
  ) : (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sage text-xs font-semibold text-ink">{initials}</span>
  );
}
