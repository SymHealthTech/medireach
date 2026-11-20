import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, ImageIcon } from "lucide-react";
import type { FilterQuery } from "mongoose";
import { EmptyState } from "@/components/admin/EmptyState";
import { KindTabs } from "@/components/admin/KindTabs";
import { ListToolbar, Pagination } from "@/components/admin/ListControls";
import { Pill } from "@/components/admin/StatusBadge";
import { rolesFor } from "@/components/admin/nav";
import { requireAdminPage } from "@/lib/auth/admin";
import { oneOf, pageOf, PAGE_SIZE, param, searchRegex, type SearchParams } from "@/lib/admin/list";
import { INTAKE_STATUS_LABEL, INTAKE_STATUS_TONE } from "@/lib/admin/labels";
import { INTAKE_KINDS, INTAKE_STATUSES, type IntakeStatus } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { INTAKE_KIND_LABEL, allPhotos } from "@/lib/intake/form";
import { Intake, type IntakeDoc } from "@/models/Intake";

export const metadata: Metadata = { title: "Website forms" };

/** Forms doctors, clinics and hospitals filled in themselves from "Get started". */
export default async function IntakesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage(rolesFor("/admin/intakes"));
  await connectToDatabase();
  const sp = await searchParams;

  const filter: FilterQuery<IntakeDoc> = {};
  const status = oneOf(param(sp, "status"), INTAKE_STATUSES);
  if (status) filter.status = status;
  // The three forms are separate lists (Doctor / Clinic / Hospital tabs), as on the website.
  const kind = oneOf(param(sp, "kind"), INTAKE_KINDS) ?? "doctor";
  filter.kind = kind;
  const re = searchRegex(param(sp, "q"));
  if (re) filter.$or = [{ name: re }, { email: re }, { phone: re }, { ref: re }];
  const page = pageOf(sp);

  const [total, rows, counts, kindCounts] = await Promise.all([
    Intake.countDocuments(filter),
    Intake.find(filter)
      .sort({ submittedAt: -1, lastSavedAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .select({ "data.designDecision": 1, kind: 1, email: 1, ref: 1, status: 1, name: 1, phone: 1, photos: 1, missingCount: 1, submittedAt: 1, updatedAfterSubmitAt: 1, lastSavedAt: 1 })
      .lean(),
    Intake.aggregate<{ _id: IntakeStatus; n: number }>([{ $match: { kind } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
    Intake.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$kind", n: { $sum: 1 } } }]),
  ]);
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
        Details sent by doctors, clinics and hospitals through <strong className="text-ink">Get started</strong> on the website. Review each form, fill any gaps, then create the website draft.
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
            return (
              <li key={String(r._id)}>
                <Link href={`/admin/intakes/${r._id}`} className="block rounded-xl border border-line bg-card p-4 shadow-soft hover:border-ink/30">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                        {r.name || r.email}
                        <Pill tone={INTAKE_STATUS_TONE[r.status]}>{INTAKE_STATUS_LABEL[r.status]}</Pill>
                        {r.updatedAfterSubmitAt && r.status !== "draft" && <Pill tone="clay">Updated</Pill>}
                        {(r.data as { designDecision?: string } | undefined)?.designDecision === "discuss" && <Pill tone="ink">Design: talk first</Pill>}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {[r.ref, r.phone, r.email].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{r.submittedAt ? `Sent ${formatDateTime(r.submittedAt)}` : `Saved ${formatDateTime(r.lastSavedAt)}`}</p>
                      <p className="flex items-center justify-end gap-3">
                        <span>{r.missingCount ? `${r.missingCount} required missing` : "All required filled"}</span>
                        <span className="inline-flex items-center gap-1">
                          <ImageIcon className="size-3.5" aria-hidden /> {nPhotos}
                          {r.photos?.viaWhatsapp ? " + WhatsApp" : ""}
                        </span>
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PAGE_SIZE)} total={total} />
    </div>
  );
}
