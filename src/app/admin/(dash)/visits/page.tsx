import type { Metadata } from "next";
import Link from "next/link";
import { Types } from "mongoose";
import { BellRing, CheckCircle2, ClipboardCheck, MapPin, Phone, Route } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { ListToolbar } from "@/components/admin/ListControls";
import { MonthlyBars, type MonthPoint } from "@/components/admin/MonthlyBars";
import { Pill } from "@/components/admin/StatusBadge";
import { rolesFor } from "@/components/admin/nav";
import { requireAdminPage } from "@/lib/auth/admin";
import { isSales } from "@/lib/admin/scope";
import { isObjectId, oneOf, param, searchRegex, type SearchParams } from "@/lib/admin/list";
import { VISIT_OUTCOME_LABEL, VISIT_OUTCOMES, type VisitOutcome } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { connectToDatabase } from "@/lib/db";
import { dayLabel, daysBefore, lastDays, todayIST } from "@/lib/visits/days";
import { Admin } from "@/models/Admin";
import { Intake } from "@/models/Intake";
import { Visit } from "@/models/Visit";
import { LogVisitButton, VisitActions } from "./VisitControls";

export const metadata: Metadata = { title: "Field visits" };

const RANGES = [
  { value: "today", label: "Today" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
] as const;
type Range = (typeof RANGES)[number]["value"];

const TONE: Record<VisitOutcome, "leaf" | "marigold" | "ink" | "clay" | "muted"> = {
  positive: "leaf",
  will_fill_form: "marigold",
  follow_up: "muted",
  not_interested: "clay",
  not_available: "muted",
};
const KIND: Record<string, string> = { doctor: "Doctor", clinic: "Clinic", hospital: "Hospital" };
const LIST_LIMIT = 400;

/**
 * Field visits: the sales executives' daily work list. A sales executive logs
 * and sees their own; the super admin sees everyone's, per executive and
 * combined, with a daily chart. A visit shows "Form filled" once the doctor or
 * clinic sends the website form (matched on name, clinic or mobile).
 */
export default async function VisitsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const admin = await requireAdminPage(rolesFor("/admin/visits"));
  await connectToDatabase();
  const sp = await searchParams;
  const sales = isSales(admin);
  const today = todayIST();

  const range: Range = oneOf(param(sp, "range"), RANGES.map((r) => r.value)) ?? "7";
  const from = range === "today" ? today : daysBefore(today, Number(range) - 1);
  const team = sales ? [] : await Admin.find({ role: "sales" }).select({ name: 1, staffId: 1, active: 1 }).sort({ name: 1 }).lean();
  const execParam = param(sp, "exec");
  const execId = sales ? admin.id : isObjectId(execParam) && team.some((t) => String(t._id) === execParam) ? execParam : undefined;
  const who = execId ? { salesAdminId: new Types.ObjectId(execId) } : {};
  const outcome = oneOf(param(sp, "outcome"), VISIT_OUTCOMES);
  const re = searchRegex(param(sp, "q"));
  const filter = {
    ...who,
    day: { $gte: from },
    ...(outcome ? { outcome } : {}),
    ...(re ? { $or: [{ doctorName: re }, { clinicName: re }, { mobile: re }, { area: re }, { notes: re }] } : {}),
  };

  const chartDays = lastDays(30, today);
  const isFormFilled = { $cond: [{ $ifNull: ["$intakeId", false] }, 1, 0] };
  const due = { ...who, followUpOn: { $lte: today, $gte: daysBefore(today, 30) }, intakeId: { $exists: false }, outcome: { $in: ["positive", "will_fill_form", "follow_up"] } };
  const [visits, perDay, perOutcome, perExec, followUps, dueCount] = await Promise.all([
    Visit.find(filter).sort({ day: -1, createdAt: -1 }).limit(LIST_LIMIT).lean(),
    Visit.aggregate<{ _id: string; n: number; forms: number }>([
      { $match: { ...who, day: { $gte: chartDays[0] } } },
      { $group: { _id: "$day", n: { $sum: 1 }, forms: { $sum: isFormFilled } } },
    ]),
    Visit.aggregate<{ _id: VisitOutcome; n: number; forms: number }>([
      { $match: { ...who, day: { $gte: from } } },
      { $group: { _id: "$outcome", n: { $sum: 1 }, forms: { $sum: isFormFilled } } },
    ]),
    sales
      ? Promise.resolve([])
      : Visit.aggregate<{ _id: Types.ObjectId; n: number; today: number; forms: number } & Record<VisitOutcome, number>>([
          { $match: { day: { $gte: from } } },
          {
            $group: {
              _id: "$salesAdminId",
              n: { $sum: 1 },
              today: { $sum: { $cond: [{ $eq: ["$day", today] }, 1, 0] } },
              forms: { $sum: isFormFilled },
              ...Object.fromEntries(VISIT_OUTCOMES.map((o) => [o, { $sum: { $cond: [{ $eq: ["$outcome", o] }, 1, 0] } }])),
            },
          },
        ]),
    Visit.find(due).sort({ followUpOn: 1 }).limit(10).lean(),
    Visit.countDocuments(due),
  ]);

  // The website forms that visits turned into.
  const intakeIds = visits.map((v) => v.intakeId).filter(Boolean);
  const forms = intakeIds.length ? await Intake.find({ _id: { $in: intakeIds } }).select({ ref: 1, status: 1 }).lean() : [];
  const formOf = new Map(forms.map((f) => [String(f._id), f]));

  const total = perOutcome.reduce((n, o) => n + o.n, 0);
  const countOf = (o: VisitOutcome) => perOutcome.find((x) => x._id === o)?.n ?? 0;
  const formsFilled = perOutcome.reduce((n, o) => n + o.forms, 0);
  const positive = countOf("positive") + countOf("will_fill_form");
  const points: MonthPoint[] = chartDays.map((d) => {
    const x = perDay.find((p) => p._id === d);
    return { label: dayLabel(d, today), axis: String(Number(d.slice(8))), value: x?.n ?? 0, detail: `${x?.forms ?? 0} form${x?.forms === 1 ? "" : "s"} filled` };
  });

  // Visits grouped by day, newest first.
  const days = [...new Set(visits.map((v) => v.day))];
  const execName = execId ? (sales ? admin.name : team.find((t) => String(t._id) === execId)?.name) : undefined;
  const rangeLabel = RANGES.find((r) => r.value === range)!.label.toLowerCase();
  const href = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { range, exec: sales ? undefined : execId, outcome, q: param(sp, "q"), ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    return `/admin/visits?${next.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-muted-foreground">
          {sales
            ? "Your daily work list: whom you met and what they said. When a doctor or clinic you visited sends the website form, it is matched to your visit (on the doctor's name, clinic name or mobile) and joins your work."
            : "Every sales executive's daily work list, combined or one at a time. A visit shows “Form filled” once that doctor or clinic sends the website form."}
        </p>
        {sales && <LogVisitButton />}
      </div>

      <nav aria-label="Period" className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <Link
            key={r.value}
            href={href({ range: r.value })}
            aria-current={r.value === range ? "page" : undefined}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
              r.value === range ? "border-ink bg-ink text-on-ink" : "border-line bg-card text-ink hover:border-ink/40",
            )}
          >
            {r.label}
          </Link>
        ))}
      </nav>

      <section aria-label="Totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Visits (${rangeLabel})`} value={total} icon={Route} hint={execName ? execName : sales ? undefined : "All sales executives"} />
        <Stat label="Positive or will fill the form" value={positive} icon={CheckCircle2} hint={total ? `${Math.round((positive / total) * 100)}% of visits` : undefined} />
        <Stat label="Forms filled" value={formsFilled} icon={ClipboardCheck} hint={total ? `${Math.round((formsFilled / total) * 100)}% of visits` : undefined} />
        <Stat label="Follow-ups due" value={dueCount} icon={BellRing} hint="Due today or overdue" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section className="rounded-xl border border-line bg-card p-5 shadow-soft">
          <MonthlyBars title={`Visits per day, last 30 days${execName ? ` · ${execName}` : sales ? "" : " · all sales executives"}`} points={points} unit="count" period="Day" labelEvery={5} />
        </section>
        <section aria-labelledby="replies" className="rounded-xl border border-line bg-card p-5 shadow-soft">
          <h2 id="replies" className="text-sm font-semibold text-ink">
            Replies ({rangeLabel})
          </h2>
          {total === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No visits in this period.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead className="sr-only">
                <tr>
                  <th>Reply</th>
                  <th>Visits</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {VISIT_OUTCOMES.map((o) => {
                  const n = countOf(o);
                  return (
                    <tr key={o}>
                      <td className="py-1.5 pr-3">
                        <Link href={href({ outcome: outcome === o ? undefined : o })} className="hover:underline">
                          {VISIT_OUTCOME_LABEL[o]}
                        </Link>
                      </td>
                      <td className="w-2/5 py-1.5">
                        <span className="block h-2 rounded-full bg-muted" aria-hidden>
                          <span className="block h-2 rounded-full bg-ink" style={{ width: `${(n / total) * 100}%` }} />
                        </span>
                      </td>
                      <td className="py-1.5 pl-3 text-right tabular-nums">
                        {n} <span className="text-xs text-muted-foreground">({Math.round((n / total) * 100)}%)</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {!sales && (
        <section aria-labelledby="by-exec" className="overflow-hidden rounded-xl border border-line bg-card shadow-soft">
          <h2 id="by-exec" className="px-4 pt-4 text-sm font-semibold text-ink">
            By sales executive ({rangeLabel})
          </h2>
          {team.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No sales executives yet. Add them under{" "}
              <Link href="/admin/settings#users" className="font-medium text-ink underline">
                Settings → Dashboard users
              </Link>
              .
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="mt-2 w-full min-w-[720px] text-sm">
                <thead className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5">Sales executive</th>
                    <th className="px-3 py-2.5 text-right">Today</th>
                    <th className="px-3 py-2.5 text-right">Visits</th>
                    <th className="px-3 py-2.5 text-right">Positive</th>
                    <th className="px-3 py-2.5 text-right">Will fill form</th>
                    <th className="px-3 py-2.5 text-right">Follow up</th>
                    <th className="px-3 py-2.5 text-right">Not interested</th>
                    <th className="px-3 py-2.5 text-right">Forms filled</th>
                  </tr>
                </thead>
                <tbody>
                  {team.map((t) => {
                    const r = perExec.find((x) => String(x._id) === String(t._id));
                    const selected = execId === String(t._id);
                    return (
                      <tr key={String(t._id)} className={cn("border-t border-line", selected && "bg-accent/50")}>
                        <td className="px-4 py-2">
                          <Link href={href({ exec: selected ? undefined : String(t._id) })} className="font-semibold text-ink hover:underline">
                            {t.name}
                          </Link>
                          {t.staffId && <span className="ml-2 font-mono text-[11px] text-muted-foreground">{t.staffId}</span>}
                          {!t.active && <span className="ml-2 text-xs text-muted-foreground">(inactive)</span>}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{r?.today ?? 0}</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">{r?.n ?? 0}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r?.positive ?? 0}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r?.will_fill_form ?? 0}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r?.follow_up ?? 0}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r?.not_interested ?? 0}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r?.forms ?? 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {execId && (
            <p className="px-4 py-3 text-sm">
              <Link href={href({ exec: undefined })} className="font-medium text-ink underline underline-offset-2">
                Show all sales executives together
              </Link>
            </p>
          )}
        </section>
      )}

      {followUps.length > 0 && (
        <section aria-labelledby="follow-ups" className="rounded-xl border border-marigold/40 bg-marigold/10 p-4">
          <h2 id="follow-ups" className="flex items-center gap-2 text-sm font-semibold text-ink">
            <BellRing className="size-4" strokeWidth={1.75} /> Follow-ups due
          </h2>
          <ul className="mt-2 space-y-1 text-sm">
            {followUps.map((f) => (
              <li key={String(f._id)}>
                <span className="font-medium text-ink">{f.doctorName || f.clinicName}</span>
                {f.doctorName && f.clinicName ? ` · ${f.clinicName}` : ""}
                {f.mobile && (
                  <a href={`tel:+91${f.mobile}`} className="ml-2 text-ink underline underline-offset-2">
                    {f.mobile}
                  </a>
                )}
                <span className="text-muted-foreground">
                  {" "}
                  · due {dayLabel(f.followUpOn!, today)}
                  {!sales ? ` · ${f.salesName}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="work-list" className="space-y-3">
        <h2 id="work-list" className="font-display text-xl font-semibold text-ink">
          {sales ? "Your visits" : execName ? `${execName}'s visits` : "All visits"}
        </h2>
        <ListToolbar
          placeholder="Search doctor, clinic, mobile, area…"
          filters={[
            ...(sales ? [] : [{ name: "exec", label: "Sales executive", options: team.map((t) => ({ value: String(t._id), label: `${t.name}${t.staffId ? ` · ${t.staffId}` : ""}` })) }]),
            { name: "outcome", label: "Reply", options: VISIT_OUTCOMES.map((o) => ({ value: o, label: VISIT_OUTCOME_LABEL[o] })) },
          ]}
        />
        {visits.length === 0 ? (
          <EmptyState
            icon={Route}
            title="No visits in this period"
            description={sales ? "Log each doctor, clinic or hospital you visit, with their reply." : "Sales executives' visits appear here as they log them."}
          />
        ) : (
          days.map((d) => {
            const list = visits.filter((v) => v.day === d);
            return (
              <div key={d} className="overflow-hidden rounded-xl border border-line bg-card shadow-soft">
                <h3 className="flex items-baseline justify-between border-b border-line bg-muted px-4 py-2 text-sm font-semibold text-ink">
                  {dayLabel(d, today)}
                  <span className="text-xs font-normal text-muted-foreground">
                    {list.length} visit{list.length === 1 ? "" : "s"}
                  </span>
                </h3>
                <ul className="divide-y divide-line">
                  {list.map((v) => {
                    const form = v.intakeId ? formOf.get(String(v.intakeId)) : undefined;
                    const name = v.doctorName || v.clinicName || "Visit";
                    return (
                      <li key={String(v._id)} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-ink">{name}</span>
                            {v.doctorName && v.clinicName && <span className="text-sm text-body">{v.clinicName}</span>}
                            <span className="text-xs text-muted-foreground">{KIND[v.kind]}</span>
                          </p>
                          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                            {v.mobile && (
                              <a href={`tel:+91${v.mobile}`} className="inline-flex items-center gap-1 hover:text-ink">
                                <Phone className="size-3.5" /> {v.mobile}
                              </a>
                            )}
                            {v.area && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="size-3.5" /> {v.area}
                              </span>
                            )}
                            {!sales && <span>by {v.salesName}</span>}
                            {v.followUpOn && !form && <span>follow up {dayLabel(v.followUpOn, today).toLowerCase()}</span>}
                          </p>
                          {v.notes && <p className="text-sm text-body">{v.notes}</p>}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill tone={TONE[v.outcome]}>{VISIT_OUTCOME_LABEL[v.outcome]}</Pill>
                          {form && (
                            <Link href={`/admin/intakes/${String(v.intakeId)}`} title={v.matchedOn?.length ? `Matched on ${v.matchedOn.join(", ")}` : undefined}>
                              <Pill tone="leaf">
                                <ClipboardCheck className="mr-1 inline size-3.5" />
                                Form filled · {form.ref}
                              </Pill>
                            </Link>
                          )}
                          <VisitActions
                            id={String(v._id)}
                            name={name}
                            initial={{
                              day: v.day,
                              kind: v.kind,
                              doctorName: v.doctorName ?? "",
                              clinicName: v.clinicName ?? "",
                              mobile: v.mobile ?? "",
                              area: v.area ?? "",
                              outcome: v.outcome,
                              followUpOn: v.followUpOn ?? "",
                              notes: v.notes ?? "",
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })
        )}
        {visits.length === LIST_LIMIT && <p className="text-sm text-muted-foreground">Showing the latest {LIST_LIMIT}. Pick a shorter period or a filter to see the rest.</p>}
      </section>
    </div>
  );
}

function Stat({ label, value, hint, icon: Icon }: { label: string; value: number; hint?: string; icon: typeof Route }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4 shadow-soft">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" strokeWidth={1.75} /> {label}
      </p>
      <p className="mt-1 font-display text-3xl font-semibold leading-none tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
