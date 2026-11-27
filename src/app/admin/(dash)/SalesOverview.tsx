import Link from "next/link";
import { Types } from "mongoose";
import { Building2, Clock, FilePen, Hospital, Lock, Route, UserPlus, UserRound, Users } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { CurrentAdmin } from "@/lib/auth/admin";
import { leadScope, ownedScope } from "@/lib/admin/scope";
import { timeAgo } from "@/lib/format";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";
import { Lead } from "@/models/Lead";
import { Visit } from "@/models/Visit";
import { daysBefore, todayIST } from "@/lib/visits/days";
import { LogVisitButton } from "./visits/VisitControls";

/**
 * The sales executive's dashboard: only their own doctors, clinics and
 * hospitals and their own leads. No payments, nobody else's work. Shows what
 * to finish (drafts), what waits for the super admin (in review: payment and
 * publishing), and what is live.
 */
export async function SalesOverview({ admin, greeting }: { admin: CurrentAdmin; greeting: string }) {
  const own = ownedScope(admin);
  const pick = { status: 1, updatedAt: 1 } as const;
  const today = todayIST();
  const mine = { salesAdminId: new Types.ObjectId(admin.id) };
  const [doctors, sites, newLeads, visitsToday, followUpsDue] = await Promise.all([
    DoctorProfile.find(own).select({ ...pick, title: 1, firstName: 1, lastName: 1, displayName: 1 }).sort({ updatedAt: -1 }).lean(),
    Establishment.find(own).select({ ...pick, name: 1, kind: 1 }).sort({ updatedAt: -1 }).lean(),
    Lead.countDocuments({ ...leadScope(admin), status: "new" }),
    Visit.countDocuments({ ...mine, day: today }),
    Visit.countDocuments({ ...mine, followUpOn: { $lte: today, $gte: daysBefore(today, 30) }, intakeId: { $exists: false }, outcome: { $in: ["positive", "will_fill_form", "follow_up"] } }),
  ]);

  type Item = { id: string; name: string; kind: "doctor" | "clinic" | "hospital"; status: string; updatedAt: Date; href: string };
  const items: Item[] = [
    ...doctors.map((d) => ({
      id: String(d._id),
      name: d.displayName || `${d.title || "Dr."} ${d.firstName} ${d.lastName}`,
      kind: "doctor" as const,
      status: d.status,
      updatedAt: d.updatedAt,
      href: `/admin/doctors/${d._id}`,
    })),
    ...sites.map((s) => ({ id: String(s._id), name: s.name, kind: s.kind, status: s.status, updatedAt: s.updatedAt, href: `/admin/establishments/${s._id}?kind=${s.kind}` })),
  ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const countsOf = (kind: Item["kind"]) => {
    const mine = items.filter((i) => i.kind === kind);
    const n = (s: string) => mine.filter((i) => i.status === s).length;
    return { total: mine.length, published: n("published"), draft: n("draft"), review: n("review") };
  };
  const drafts = items.filter((i) => i.status === "draft");
  const inReview = items.filter((i) => i.status === "review");
  const live = items.filter((i) => i.status === "published");
  const firstName = admin.name.split(/\s+/)[0];

  const products = [
    { label: "Doctors", icon: UserRound, href: "/admin/doctors", c: countsOf("doctor") },
    { label: "Clinics", icon: Building2, href: "/admin/establishments?kind=clinic", c: countsOf("clinic") },
    { label: "Hospitals", icon: Hospital, href: "/admin/establishments?kind=hospital", c: countsOf("hospital") },
  ];
  const actions = [
    { href: "/admin/doctors/new", label: "New doctor", icon: UserPlus },
    { href: "/admin/establishments/new?kind=clinic", label: "New clinic", icon: Building2 },
    { href: "/admin/establishments/new?kind=hospital", label: "New hospital", icon: Hospital },
    { href: "/admin/leads", label: "New lead", icon: Users },
  ];

  return (
    <div className="space-y-8">
      <section>
        <p className="font-display text-2xl font-semibold text-ink sm:text-3xl">
          {greeting}, {firstName}.
        </p>
        <p className="mt-1 text-muted-foreground">
          Your doctors, clinics and hospitals{admin.staffId ? ` · Staff ID ${admin.staffId}` : ""}.
        </p>
      </section>

      <section aria-labelledby="field" className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-line bg-card p-4 shadow-soft">
        <h2 id="field" className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Route className="size-4" strokeWidth={1.75} /> In the field today
        </h2>
        <Link href="/admin/visits?range=today" className="text-sm hover:underline">
          <strong className="font-display text-2xl tabular-nums text-ink">{visitsToday}</strong> <span className="text-muted-foreground">visit{visitsToday === 1 ? "" : "s"} logged</span>
        </Link>
        <Link href="/admin/visits" className="text-sm hover:underline">
          <strong className="font-display text-2xl tabular-nums text-ink">{followUpsDue}</strong> <span className="text-muted-foreground">follow-up{followUpsDue === 1 ? "" : "s"} due</span>
        </Link>
        <span className="ml-auto">
          <LogVisitButton />
        </span>
      </section>

      <section aria-label="Your websites" className="grid gap-3 sm:grid-cols-3">
        {products.map(({ label, icon: Icon, href, c }) => (
          <Link key={label} href={href} className="block rounded-xl border border-line bg-card p-4 shadow-soft transition hover:border-ink/30">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon className="size-4" strokeWidth={1.75} /> {label}
            </p>
            <p className="mt-1 font-display text-3xl font-semibold leading-none text-ink">{c.total}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {c.published} live · {c.draft} drafts · {c.review} in review
            </p>
          </Link>
        ))}
      </section>

      <section aria-labelledby="quick-actions" className="space-y-3">
        <h2 id="quick-actions" className="text-sm font-semibold text-muted-foreground">
          Quick actions
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                {label === "New lead" && newLeads > 0 && <span className="ml-auto text-xs font-medium text-muted-foreground">{newLeads} new</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <ItemList
          title="Drafts to finish"
          icon={FilePen}
          items={drafts}
          empty="No drafts. Start a new doctor, clinic or hospital above."
          hint="Fill every step, then Send for review on the last step."
        />
        <ItemList
          title="Waiting for the super admin"
          icon={Clock}
          items={inReview}
          empty="Nothing waiting."
          hint="The super admin publishes once the payment is received."
        />
        <ItemList
          title="Live"
          icon={Lock}
          items={live}
          empty="Nothing live yet."
          hint="To change a live website, ask the owner for the code we email them."
        />
      </div>
    </div>
  );
}

function ItemList({
  title,
  icon: Icon,
  items,
  empty,
  hint,
}: {
  title: string;
  icon: typeof Clock;
  items: { id: string; name: string; kind: string; status: string; updatedAt: Date; href: string }[];
  empty: string;
  hint: string;
}) {
  const KIND = { doctor: "Doctor", clinic: "Clinic", hospital: "Hospital" } as Record<string, string>;
  return (
    <section className="rounded-xl border border-line bg-card p-5 shadow-soft">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Icon className="size-4" strokeWidth={1.75} /> {title}
        <span className="ml-auto text-xs font-normal text-muted-foreground">{items.length}</span>
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {items.slice(0, 8).map((i) => (
            <li key={i.id}>
              <Link href={i.href} className="flex items-center gap-3 py-2.5 text-sm hover:underline">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{i.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {KIND[i.kind]} · {timeAgo(i.updatedAt)}
                  </span>
                </span>
                <StatusBadge status={i.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
