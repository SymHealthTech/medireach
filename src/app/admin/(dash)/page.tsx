import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, ShieldAlert, UserPlus, Users } from "lucide-react";
import { MonthlyBars, type MonthPoint } from "@/components/admin/MonthlyBars";
import { can, requireAdminPage } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db";
import { formatINR, monthLabel, startOfMonthIST, timeAgo } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { nowInIndia } from "@/lib/timings";
import { AuditLog } from "@/models/AuditLog";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Lead } from "@/models/Lead";
import { Payment } from "@/models/Payment";
import { UpdateRequest } from "@/models/UpdateRequest";

export const metadata: Metadata = { title: "Overview" };

function greeting(): string {
  const hourIST = Math.floor(nowInIndia().minutes / 60);
  if (hourIST < 12) return "Good morning";
  if (hourIST < 17) return "Good afternoon";
  return "Good evening";
}

/** Human wording for audit actions in the activity feed. */
function describe(action: string): string {
  const map: Record<string, string> = {
    "doctor.create": "created a doctor draft",
    "doctor.publish": "published a page",
    "doctor.republish": "republished a page",
    "doctor.unpublish": "unpublished a page",
    "doctor.suspend": "suspended a page",
    "doctor.duplicate": "duplicated a doctor",
    "doctor.submit_review": "sent a page for review",
    "lead.create": "added a lead",
    "lead.status": "updated a lead",
    "payment.record": "recorded a payment",
    "update_request.create": "logged an update request",
    "update_request.status": "moved an update request",
    "hospital.create": "added a hospital",
    "settings.update": "changed settings",
    "admin.login": "logged in",
  };
  if (map[action]) return map[action];
  if (action.startsWith("doctor.update.")) return `edited a doctor (${action.split(".")[2]})`;
  if (action.startsWith("master.")) return "edited master lists";
  return action.replace(/[._]/g, " ");
}

function StatCard({ label, value, hint, href }: { label: string; value: string | number; hint?: string; href?: string }) {
  const body = (
    <>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold leading-none text-ink">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </>
  );
  const cls = "block rounded-xl border border-line bg-card p-4 shadow-soft";
  return href ? (
    <Link href={href} className={`${cls} transition hover:border-ink/30`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Founding spots left with a marigold progress ring (DESIGN_BRIEF.md §4). */
function FoundingCard({ left, total }: { left: number; total: number }) {
  const used = Math.max(0, total - left);
  const pct = total > 0 ? used / total : 0;
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-line bg-card p-4 shadow-soft">
      <svg viewBox="0 0 64 64" className="size-16 shrink-0 -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-line" />
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" strokeLinecap="round" className="stroke-marigold" strokeDasharray={`${pct * c} ${c}`} />
      </svg>
      <div>
        <p className="text-sm text-muted-foreground">Founding spots left</p>
        <p className="font-display text-3xl font-semibold leading-none text-ink">{left}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {used} of {total} taken
        </p>
      </div>
    </div>
  );
}

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const admin = await requireAdminPage();
  await connectToDatabase();
  const { denied } = await searchParams;
  const showMoney = can.seePaymentTotals(admin.role);
  const monthStart = startOfMonthIST(0);
  const sixMonthsAgo = startOfMonthIST(5);

  const [statusCounts, foundingUsed, settings, newLeads, openRequests, monthSales, monthly, published, activity] = await Promise.all([
    DoctorProfile.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    DoctorProfile.countDocuments({ foundingDoctor: true }),
    getSettings(),
    Lead.countDocuments({ status: "new" }),
    showMoney ? UpdateRequest.countDocuments({ status: { $ne: "done" } }) : Promise.resolve(0),
    showMoney
      ? Payment.aggregate<{ amount: number; n: number }>([{ $match: { date: { $gte: monthStart } } }, { $group: { _id: null, amount: { $sum: "$amount" }, n: { $sum: 1 } } }])
      : Promise.resolve([]),
    showMoney
      ? Payment.aggregate<{ _id: string; amount: number; n: number }>([
          { $match: { date: { $gte: sixMonthsAgo } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date", timezone: "Asia/Kolkata" } }, amount: { $sum: "$amount" }, n: { $sum: 1 } } },
        ])
      : Promise.resolve([]),
    DoctorProfile.aggregate<{ _id: string; n: number }>([
      { $match: { publishedAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$publishedAt", timezone: "Asia/Kolkata" } }, n: { $sum: 1 } } },
    ]),
    AuditLog.find(showMoney ? {} : { action: { $not: /^(payment|settings|admin_user)/ } })
      .sort({ at: -1 })
      .limit(10)
      .lean(),
  ]);

  const count = (s: string) => statusCounts.find((c) => c._id === s)?.n ?? 0;
  const total = statusCounts.reduce((a, c) => a + c.n, 0);
  const months = Array.from({ length: 6 }, (_, i) => {
    const start = startOfMonthIST(5 - i);
    return { key: new Date(start.getTime() + 5.5 * 3600_000).toISOString().slice(0, 7), label: monthLabel(new Date(start.getTime() + 6 * 3600_000)) };
  });
  const salesPoints: MonthPoint[] = months.map((m) => {
    const x = monthly.find((r) => r._id === m.key);
    return { label: m.label, value: x?.amount ?? 0, detail: `${x?.n ?? 0} payment${x?.n === 1 ? "" : "s"}` };
  });
  const publishedPoints: MonthPoint[] = months.map((m) => ({ label: m.label, value: published.find((r) => r._id === m.key)?.n ?? 0 }));
  const firstName = admin.name.split(/\s+/)[0];

  const actions = [
    { href: "/admin/doctors/new", label: "New doctor", icon: UserPlus, show: true },
    { href: "/admin/leads", label: "New lead", icon: Users, show: true },
    { href: "/admin/payments", label: "Record payment", icon: CreditCard, show: showMoney },
  ].filter((a) => a.show);

  return (
    <div className="space-y-8">
      {denied && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-clay/30 bg-clay/10 p-4 text-sm">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-clay" strokeWidth={1.75} />
          <p>That section isn&apos;t available for your role. Ask a super admin if you need access.</p>
        </div>
      )}

      <section>
        <p className="font-display text-2xl font-semibold text-ink sm:text-3xl">
          {greeting()}, {firstName}.
        </p>
        <p className="mt-1 text-muted-foreground">Here&apos;s where things stand today.</p>
      </section>

      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Doctors" value={total} hint={`${count("published")} published · ${count("draft")} drafts`} href="/admin/doctors" />
        <StatCard label="In review" value={count("review")} hint="Waiting for an admin to publish" href="/admin/doctors?status=review" />
        <StatCard label="New leads" value={newLeads} href="/admin/leads?status=new" />
        {showMoney ? (
          <StatCard label="This month's sales" value={formatINR(monthSales[0]?.amount ?? 0)} hint={`${monthSales[0]?.n ?? 0} payment${monthSales[0]?.n === 1 ? "" : "s"}`} href="/admin/payments" />
        ) : (
          <StatCard label="Published" value={count("published")} href="/admin/pages" />
        )}
        <div className="col-span-2">
          <FoundingCard left={Math.max(0, settings.foundingTotal - foundingUsed)} total={settings.foundingTotal} />
        </div>
        {showMoney && <StatCard label="Open update requests" value={openRequests} href="/admin/update-requests" />}
        {count("suspended") > 0 && <StatCard label="Suspended" value={count("suspended")} href="/admin/doctors?status=suspended" />}
      </section>

      <section aria-labelledby="quick-actions" className="space-y-3">
        <h2 id="quick-actions" className="text-sm font-semibold text-muted-foreground">
          Quick actions
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {actions.map(({ href, label, icon: Icon }) => (
            <li key={label}>
              <Link
                href={href}
                className="flex h-16 items-center gap-3 rounded-xl border border-line bg-card px-4 font-semibold text-ink shadow-soft transition hover:border-ink/30 active:scale-[.98]"
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-sage">
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section className="rounded-xl border border-line bg-card p-5 shadow-soft">
          {showMoney ? (
            <MonthlyBars title="Sales, last 6 months" points={salesPoints} unit="inr" />
          ) : (
            <MonthlyBars title="Pages published, last 6 months" points={publishedPoints} unit="count" />
          )}
        </section>

        <section aria-labelledby="activity" className="rounded-xl border border-line bg-card p-5 shadow-soft">
          <h2 id="activity" className="text-sm font-semibold text-ink">
            Recent activity
          </h2>
          {activity.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nothing yet.</p>
          ) : (
            <ol className="mt-3 space-y-3">
              {activity.map((a) => (
                <li key={String(a._id)} className="flex gap-3 text-sm">
                  <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-sage ring-2 ring-card" />
                  <span className="min-w-0">
                    <span className="font-medium text-ink">{a.actor?.name ?? "Someone"}</span> <span className="text-body">{describe(a.action)}</span>
                    <span className="block text-xs text-muted-foreground">{timeAgo(a.at)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
