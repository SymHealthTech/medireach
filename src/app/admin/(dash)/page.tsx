import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, CreditCard, ShieldAlert, UserPlus, Users } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { can, requireAdminPage } from "@/lib/auth/admin";
import { nowInIndia } from "@/lib/timings";

export const metadata: Metadata = { title: "Overview" };

function greeting(): string {
  const hourIST = Math.floor(nowInIndia().minutes / 60);
  if (hourIST < 12) return "Good morning";
  if (hourIST < 17) return "Good afternoon";
  return "Good evening";
}

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const admin = await requireAdminPage();
  const { denied } = await searchParams;
  const firstName = admin.name.split(/\s+/)[0];

  const actions = [
    { href: "/admin/doctors/new", label: "New doctor", icon: UserPlus, show: true },
    { href: "/admin/leads", label: "New lead", icon: Users, show: true },
    { href: "/admin/payments", label: "Record payment", icon: CreditCard, show: can.seePaymentTotals(admin.role) },
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
        <p className="mt-1 text-muted-foreground">Here&apos;s where you add doctors, publish pages and track sales.</p>
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

      <EmptyState
        icon={BarChart3}
        title="Stats and activity arrive with the dashboard features"
        description="Doctor counts, Founding Doctor spots left, this month's sales, open update requests, new leads and recent activity."
      />
    </div>
  );
}
