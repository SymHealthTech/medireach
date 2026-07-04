"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/client/api";

interface Revenue {
  subscriptions: { active: number; paused: number; unsubscribed: number; suspended: number; incompleteOnboarding: number; total: number };
  revenue: { paidLast30dInr: number; paidInvoicesLast30d: number; outstandingInr: number; outstandingInvoices: number };
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stat("Revenue (last 30 days)", `₹${data.revenue.paidLast30dInr}`, `${data.revenue.paidInvoicesLast30d} invoices paid`)}
        {stat("Outstanding", `₹${data.revenue.outstandingInr}`, `${data.revenue.outstandingInvoices} unpaid`)}
        {stat("Incomplete onboarding", data.subscriptions.incompleteOnboarding, `${data.subscriptions.total} total accounts`)}
      </div>
    </div>
  );
}
