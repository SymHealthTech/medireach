"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/client/api";

interface Revenue {
  subscriptions: { active: number; paused: number; unsubscribed: number; suspended: number; incompleteOnboarding: number; total: number };
  tiers: { starter: number; pro: number };
  revenue: {
    paidLast30dInr: number; paidInvoicesLast30d: number;
    starterPaidLast30dInr: number; starterInvoicesLast30d: number;
    proPaidLast30dInr: number; proInvoicesLast30d: number;
    outstandingInr: number; outstandingInvoices: number;
  };
}

/** Admin dashboard — business-level billing & revenue overview (spec §6.2). */
export default function AdminDashboard() {
  const [data, setData] = useState<Revenue | null>(null);

  useEffect(() => {
    apiGet<Revenue>("/api/admin/revenue").then(setData).catch(() => {});
  }, []);

  if (!data) return <p className="text-ink-muted">Loading…</p>;

  const stat = (label: string, value: string | number, sub?: string) => (
    <Card>
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="text-xl font-semibold tracking-tight text-ink">{value}</p>
      {sub && <p className="text-xs text-ink-muted">{sub}</p>}
    </Card>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight text-ink">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stat("Active subscriptions", data.subscriptions.active)}
        {stat("Paused (non-payment)", data.subscriptions.paused)}
        {stat("Unsubscribed", data.subscriptions.unsubscribed)}
        {stat("Suspended", data.subscriptions.suspended)}
      </div>

      {/* Doctors per tier (live subscriptions) — Change 7. */}
      <div className="grid grid-cols-2 gap-4">
        {stat("Starter doctors", data.tiers.starter, "typing only · flat ₹499")}
        {stat("Pro doctors", data.tiers.pro, "voice + AI · per-patient")}
      </div>

      {/* Revenue split by tier — Starter is fixed ₹499×count; Pro varies with usage. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stat("Revenue (last 30 days)", `₹${data.revenue.paidLast30dInr}`, `${data.revenue.paidInvoicesLast30d} invoices paid`)}
        {stat("Starter revenue (30d)", `₹${data.revenue.starterPaidLast30dInr}`, `${data.revenue.starterInvoicesLast30d} invoices · fixed ₹499`)}
        {stat("Pro revenue (30d)", `₹${data.revenue.proPaidLast30dInr}`, `${data.revenue.proInvoicesLast30d} invoices · usage-based`)}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {stat("Outstanding", `₹${data.revenue.outstandingInr}`, `${data.revenue.outstandingInvoices} unpaid`)}
        {stat("Incomplete onboarding", data.subscriptions.incompleteOnboarding, `${data.subscriptions.total} total accounts`)}
      </div>
    </div>
  );
}
