"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiGet, apiPost } from "@/lib/client/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "income" | "expenses" | "tally";

interface MonthSummary {
  month: string;
  label: string;
  total: number;
  count: number;
}

interface VisitEntry {
  index: number;
  patientName: string;
  fees: number;
}

interface DayGroup {
  date: string;
  label: string;
  total: number;
  count: number;
  visits: VisitEntry[];
}

interface Expense {
  _id: string;
  category: string;
  categoryLabel: string;
  billNumber: string;
  date: string;
  vendorName: string;
  description: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  isNA: boolean;
}

interface ExpenseMonth {
  month: string;
  label: string;
  total: number;
  expenses: Expense[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "rent", label: "Monthly Rent" },
  { value: "electricity", label: "Light / Electricity" },
  { value: "medicine", label: "Medicine Purchase" },
  { value: "salary", label: "Staff Salary" },
  { value: "equipment", label: "Equipment" },
  { value: "other", label: "Other" },
] as const;

const EMPTY_FORM = {
  category: "medicine" as string,
  billNumber: "",
  date: "",
  vendorName: "",
  description: "",
  totalAmount: "",
  paidAmount: "",
  isNA: false,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function apiPut<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Something went wrong.");
  return data as T;
}

async function apiDelete(path: string): Promise<void> {
  const res = await fetch(path, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Something went wrong.");
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RevenuePage() {
  const [tab, setTab] = useState<Tab>("income");

  // Income
  const [incomeMonths, setIncomeMonths] = useState<MonthSummary[] | null>(null);
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [thisMonthTotal, setThisMonthTotal] = useState(0);
  const [thisMonthCount, setThisMonthCount] = useState(0);
  const [expandedIncMonth, setExpandedIncMonth] = useState<string | null>(null);
  const [monthDetails, setMonthDetails] = useState<Record<string, DayGroup[]>>({});
  const [loadingMonth, setLoadingMonth] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Expenses
  const [expenseMonths, setExpenseMonths] = useState<ExpenseMonth[] | null>(null);
  const [expandedExpMonth, setExpandedExpMonth] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);

  const loadIncome = useCallback(async () => {
    const d = await apiGet<{
      months: MonthSummary[];
      todayTotal: number;
      todayCount: number;
      thisMonthTotal: number;
      thisMonthCount: number;
    }>("/api/revenue/income").catch(() => null);
    if (!d) return;
    setIncomeMonths(d.months);
    setTodayTotal(d.todayTotal);
    setTodayCount(d.todayCount);
    setThisMonthTotal(d.thisMonthTotal);
    setThisMonthCount(d.thisMonthCount);
  }, []);

  const loadExpenses = useCallback(async () => {
    const d = await apiGet<{ months: ExpenseMonth[] }>("/api/revenue/expenses").catch(() => null);
    if (d) setExpenseMonths(d.months);
  }, []);

  useEffect(() => {
    loadIncome();
    loadExpenses();
  }, [loadIncome, loadExpenses]);

  // Expand/collapse an income month — lazy-loads detail on first open
  async function toggleIncMonth(month: string) {
    if (expandedIncMonth === month) { setExpandedIncMonth(null); return; }
    setExpandedIncMonth(month);
    setExpandedDay(null);
    if (!monthDetails[month]) {
      setLoadingMonth(month);
      try {
        const d = await apiGet<{ days: DayGroup[] }>(`/api/revenue/income?month=${month}`);
        setMonthDetails((p) => ({ ...p, [month]: d.days }));
      } finally {
        setLoadingMonth(null);
      }
    }
  }

  function toggleDay(key: string) {
    setExpandedDay((p) => (p === key ? null : key));
  }

  // Expense form helpers
  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) });
    setFormErr(null);
    setShowForm(true);
  }

  function openEdit(e: Expense) {
    setEditingId(e._id);
    setForm({
      category: e.category,
      billNumber: e.billNumber,
      date: e.date.slice(0, 10),
      vendorName: e.vendorName,
      description: e.description,
      totalAmount: String(e.totalAmount),
      paidAmount: String(e.paidAmount),
      isNA: e.isNA,
    });
    setFormErr(null);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setFormErr(null);
  }

  async function submitForm(ev: React.FormEvent) {
    ev.preventDefault();
    setFormErr(null);

    const total = parseFloat(form.totalAmount);
    const paid = parseFloat(form.paidAmount || "0");
    if (!form.isNA) {
      if (isNaN(total) || total < 0) { setFormErr("Enter a valid bill amount."); return; }
      if (isNaN(paid) || paid < 0) { setFormErr("Enter a valid paid amount."); return; }
      if (paid > total) { setFormErr("Paid amount cannot exceed bill amount."); return; }
    }

    const body = {
      category: form.category,
      billNumber: form.billNumber,
      date: form.date || new Date().toISOString().slice(0, 10),
      vendorName: form.isNA ? "Own Clinic" : form.vendorName,
      description: form.description,
      totalAmount: form.isNA ? 0 : total,
      paidAmount: form.isNA ? 0 : paid,
      isNA: form.isNA,
    };

    setSaving(true);
    try {
      if (editingId) {
        await apiPut(`/api/revenue/expenses/${editingId}`, body);
      } else {
        await apiPost("/api/revenue/expenses", body);
      }
      setShowForm(false);
      setEditingId(null);
      await loadExpenses();
    } catch (ex) {
      setFormErr((ex as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense(id: string) {
    if (!confirm("Delete this expense entry?")) return;
    setDeletingId(id);
    try {
      await apiDelete(`/api/revenue/expenses/${id}`);
      await loadExpenses();
    } catch (ex) {
      alert((ex as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  // Tally computation
  const incomeByMonth = Object.fromEntries((incomeMonths ?? []).map((m) => [m.month, m]));
  const expenseByMonth = Object.fromEntries((expenseMonths ?? []).map((m) => [m.month, m]));
  const allMonths = Array.from(
    new Set([
      ...(incomeMonths ?? []).map((m) => m.month),
      ...(expenseMonths ?? []).map((m) => m.month),
    ]),
  ).sort((a, b) => b.localeCompare(a));

  const grandInc = (incomeMonths ?? []).reduce((s, m) => s + m.total, 0);
  const grandExp = (expenseMonths ?? []).reduce((s, m) => s + m.total, 0);
  const grandNet = grandInc - grandExp;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Revenue</h1>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-2xl bg-line/30 p-1">
        {(["income", "expenses", "tally"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors",
              tab === t
                ? "bg-surface-raised text-ink shadow-sm"
                : "text-ink-muted hover:text-ink",
            ].join(" ")}
          >
            {t === "income" ? "Income" : t === "expenses" ? "Expenses" : "Tally"}
          </button>
        ))}
      </div>

      {/* ════════════ INCOME ════════════ */}
      {tab === "income" && (
        <div className="space-y-4">
          {/* Quick stats */}
          {incomeMonths === null ? (
            <div className="grid grid-cols-2 gap-3">
              {[0, 1].map((i) => (
                <Card key={i} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-24" />
                  <Skeleton className="h-3 w-16" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Card className="space-y-0.5 bg-brand/5 border-brand/20">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand/70">Today</p>
                <p className="text-2xl font-bold text-brand">{fmt(todayTotal)}</p>
                <p className="text-xs text-ink-muted">{todayCount} patient{todayCount !== 1 ? "s" : ""}</p>
              </Card>
              <Card className="space-y-0.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">This Month</p>
                <p className="text-2xl font-bold text-ink">{fmt(thisMonthTotal)}</p>
                <p className="text-xs text-ink-muted">{thisMonthCount} patient{thisMonthCount !== 1 ? "s" : ""}</p>
              </Card>
            </div>
          )}

          {/* Month accordion list */}
          {incomeMonths === null ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
            </div>
          ) : incomeMonths.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-muted">
              No fee records yet. Fees are entered when confirming a consultation.
            </p>
          ) : (
            <div className="space-y-2">
              {incomeMonths.map((m) => {
                const isOpen = expandedIncMonth === m.month;
                const isLoading = loadingMonth === m.month;
                const days = monthDetails[m.month] ?? [];

                return (
                  <div
                    key={m.month}
                    className="overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-sm"
                  >
                    {/* Month header */}
                    <button
                      onClick={() => toggleIncMonth(m.month)}
                      className="flex w-full items-center justify-between px-4 py-3.5 hover:bg-line/20 transition-colors"
                    >
                      <div className="text-left">
                        <p className="font-semibold text-ink">{m.label}</p>
                        <p className="text-xs text-ink-muted">{m.count} patient{m.count !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-lg font-bold text-brand">{fmt(m.total)}</p>
                        <span
                          className={`text-lg text-ink-muted transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                        >
                          ›
                        </span>
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isOpen && (
                      <div className="border-t border-line">
                        {isLoading ? (
                          <div className="space-y-2 p-4">
                            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
                          </div>
                        ) : days.length === 0 ? (
                          <p className="px-4 py-4 text-sm text-ink-muted">No fee records for this month.</p>
                        ) : (
                          <div className="divide-y divide-line">
                            {days.map((day) => {
                              const dayKey = `${m.month}|${day.date}`;
                              const dayOpen = expandedDay === dayKey;

                              return (
                                <div key={day.date}>
                                  {/* Day header */}
                                  <button
                                    onClick={() => toggleDay(dayKey)}
                                    className="flex w-full items-center justify-between px-5 py-3 hover:bg-line/15 transition-colors"
                                  >
                                    <div className="text-left">
                                      <p className="text-sm font-medium text-ink">{day.label}</p>
                                      <p className="text-xs text-ink-muted">{day.count} patient{day.count !== 1 ? "s" : ""}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-semibold text-ink">{fmt(day.total)}</p>
                                      <span
                                        className={`text-xs text-ink-muted transition-transform duration-150 ${dayOpen ? "rotate-90" : ""}`}
                                      >
                                        ›
                                      </span>
                                    </div>
                                  </button>

                                  {/* Visit table */}
                                  {dayOpen && (
                                    <div className="mx-4 mb-3 overflow-hidden rounded-xl border border-line">
                                      <table className="w-full text-sm">
                                        <thead>
                                          <tr className="border-b border-line bg-line/25">
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-ink-muted w-8">#</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-ink-muted">Patient Name</th>
                                            <th className="px-3 py-2 text-right text-xs font-semibold text-ink-muted">Fees Collected</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-line">
                                          {day.visits.map((v) => (
                                            <tr key={v.index} className="hover:bg-line/10">
                                              <td className="px-3 py-2.5 text-ink-muted text-xs">{v.index}</td>
                                              <td className="px-3 py-2.5 font-medium text-ink">{v.patientName}</td>
                                              <td className="px-3 py-2.5 text-right font-semibold text-brand">{fmt(v.fees)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                        <tfoot>
                                          <tr className="border-t-2 border-brand/20 bg-brand/5">
                                            <td colSpan={2} className="px-3 py-2 text-xs font-semibold text-ink-muted">
                                              Day Total
                                            </td>
                                            <td className="px-3 py-2 text-right text-sm font-bold text-brand">
                                              {fmt(day.total)}
                                            </td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Month total footer */}
                            <div className="flex items-center justify-between bg-brand/8 px-4 py-3">
                              <p className="text-sm font-semibold text-ink-muted">
                                Total — {m.count} patients
                              </p>
                              <p className="text-base font-bold text-brand">{fmt(m.total)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════ EXPENSES ════════════ */}
      {tab === "expenses" && (
        <div className="space-y-4">
          {!showForm && (
            <Button variant="brand" onClick={openAdd} className="w-full">
              + Add Expense
            </Button>
          )}

          {/* Add / Edit form */}
          {showForm && (
            <Card className="space-y-4">
              <h2 className="font-semibold text-ink">
                {editingId ? "Edit Expense" : "New Expense"}
              </h2>

              {formErr && (
                <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos">{formErr}</p>
              )}

              <form onSubmit={submitForm} className="space-y-4">
                {/* Category */}
                <div>
                  <Label htmlFor="exp-category">Category</Label>
                  <select
                    id="exp-category"
                    value={form.category}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, category: e.target.value, isNA: false }))
                    }
                    className="h-12 w-full rounded-xl border border-line bg-surface-raised px-3.5 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Own clinic toggle (rent only) */}
                {form.category === "rent" && (
                  <label className="flex items-center gap-2.5 rounded-xl border border-line px-4 py-3 text-sm text-ink cursor-pointer hover:bg-line/20">
                    <input
                      type="checkbox"
                      checked={form.isNA}
                      onChange={(e) => setForm((p) => ({ ...p, isNA: e.target.checked }))}
                      className="h-4 w-4 rounded accent-brand"
                    />
                    Own clinic — mark as N/A (no rent applicable)
                  </label>
                )}

                {!form.isNA && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="exp-bill">Bill Number</Label>
                        <Input
                          id="exp-bill"
                          placeholder="e.g. INV-001"
                          value={form.billNumber}
                          onChange={(e) => setForm((p) => ({ ...p, billNumber: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="exp-date">Date</Label>
                        <Input
                          id="exp-date"
                          type="date"
                          required
                          value={form.date}
                          onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="exp-vendor">Vendor / Party Name</Label>
                      <Input
                        id="exp-vendor"
                        placeholder="e.g. Medico Pharma Supplies"
                        required
                        value={form.vendorName}
                        onChange={(e) => setForm((p) => ({ ...p, vendorName: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="exp-desc">Description (optional)</Label>
                      <Input
                        id="exp-desc"
                        placeholder="e.g. Monthly stock refill"
                        value={form.description}
                        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="exp-total">Bill Amount (₹)</Label>
                        <Input
                          id="exp-total"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          required
                          value={form.totalAmount}
                          onChange={(e) => setForm((p) => ({ ...p, totalAmount: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="exp-paid">Paid (₹)</Label>
                        <Input
                          id="exp-paid"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          value={form.paidAmount}
                          onChange={(e) => setForm((p) => ({ ...p, paidAmount: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Live balance preview */}
                    {form.totalAmount !== "" && (
                      <div className="flex items-center justify-between rounded-xl bg-line/20 px-4 py-2.5">
                        <span className="text-sm text-ink-muted">Balance due</span>
                        <span className="font-semibold text-ink">
                          {fmt(
                            Math.max(
                              0,
                              parseFloat(form.totalAmount || "0") -
                                parseFloat(form.paidAmount || "0"),
                            ),
                          )}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {form.isNA && (
                  <p className="rounded-xl bg-line/20 px-4 py-3 text-sm text-ink-muted">
                    This will be recorded as <strong>N/A</strong> — own clinic, no rent applicable.
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <Button type="submit" variant="primary" disabled={saving} className="flex-1">
                    {saving ? "Saving…" : editingId ? "Update" : "Save Expense"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={cancelForm} disabled={saving}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Expense month list */}
          {expenseMonths === null ? (
            <div className="space-y-2">
              {[0, 1].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
            </div>
          ) : expenseMonths.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-muted">No expenses recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {expenseMonths.map((em) => {
                const isOpen = expandedExpMonth === em.month;

                return (
                  <div
                    key={em.month}
                    className="overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-sm"
                  >
                    <button
                      onClick={() => setExpandedExpMonth(isOpen ? null : em.month)}
                      className="flex w-full items-center justify-between px-4 py-3.5 hover:bg-line/20 transition-colors"
                    >
                      <div className="text-left">
                        <p className="font-semibold text-ink">{em.label}</p>
                        <p className="text-xs text-ink-muted">
                          {em.expenses.length} item{em.expenses.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-lg font-bold text-action">{fmt(em.total)}</p>
                        <span
                          className={`text-lg text-ink-muted transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                        >
                          ›
                        </span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-line divide-y divide-line">
                        {em.expenses.map((exp) => (
                          <div key={exp._id} className="px-4 py-3.5 space-y-2.5">
                            {/* Row header */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="rounded-lg bg-line/40 px-2 py-0.5 text-xs font-medium text-ink-muted">
                                    {exp.categoryLabel}
                                  </span>
                                  {exp.isNA && (
                                    <span className="rounded-lg bg-line/40 px-2 py-0.5 text-xs font-medium text-ink-muted">
                                      N/A
                                    </span>
                                  )}
                                  {exp.billNumber && (
                                    <span className="text-xs text-ink-muted">#{exp.billNumber}</span>
                                  )}
                                </div>
                                <p className="font-semibold text-ink">
                                  {exp.isNA ? "Own Clinic" : exp.vendorName}
                                </p>
                                {!exp.isNA && (
                                  <p className="text-xs text-ink-muted">
                                    {fmtDate(exp.date)}
                                    {exp.description ? ` · ${exp.description}` : ""}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0 pt-0.5">
                                <button
                                  onClick={() => openEdit(exp)}
                                  className="text-xs font-medium text-brand hover:underline"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteExpense(exp._id)}
                                  disabled={deletingId === exp._id}
                                  className="text-xs font-medium text-sos hover:underline disabled:opacity-40"
                                >
                                  {deletingId === exp._id ? "…" : "Delete"}
                                </button>
                              </div>
                            </div>

                            {/* Amount breakdown */}
                            {!exp.isNA && (
                              <div className="grid grid-cols-3 gap-2 rounded-xl bg-line/15 px-3 py-2.5">
                                <div>
                                  <p className="text-xs text-ink-muted mb-0.5">Bill Amount</p>
                                  <p className="text-sm font-bold text-ink">{fmt(exp.totalAmount)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-ink-muted mb-0.5">Paid</p>
                                  <p className="text-sm font-bold text-success">{fmt(exp.paidAmount)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-ink-muted mb-0.5">Balance</p>
                                  <p
                                    className={`text-sm font-bold ${exp.balance > 0 ? "text-sos" : "text-success"}`}
                                  >
                                    {exp.balance > 0 ? fmt(exp.balance) : "Cleared"}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Month total footer */}
                        <div className="flex items-center justify-between bg-action/5 px-4 py-3">
                          <p className="text-sm font-semibold text-ink-muted">
                            Month Total — {em.expenses.filter((e) => !e.isNA).length} bill
                            {em.expenses.filter((e) => !e.isNA).length !== 1 ? "s" : ""}
                          </p>
                          <p className="text-base font-bold text-action">{fmt(em.total)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════ TALLY ════════════ */}
      {tab === "tally" && (
        <div className="space-y-4">
          {incomeMonths === null || expenseMonths === null ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}
            </div>
          ) : allMonths.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-muted">
              No data yet. Add income from consultations and record expenses to see your tally.
            </p>
          ) : (
            <>
              {/* Column headers */}
              <div className="grid grid-cols-4 gap-1 px-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                <div>Month</div>
                <div className="text-right text-brand">Income</div>
                <div className="text-right text-action">Expenses</div>
                <div className="text-right">Net</div>
              </div>

              {/* Month rows */}
              <div className="overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-sm divide-y divide-line">
                {allMonths.map((ym) => {
                  const inc = incomeByMonth[ym]?.total ?? 0;
                  const exp = expenseByMonth[ym]?.total ?? 0;
                  const net = inc - exp;
                  const label =
                    incomeByMonth[ym]?.label ?? expenseByMonth[ym]?.label ?? ym;

                  return (
                    <div key={ym} className="grid grid-cols-4 gap-1 px-4 py-3.5 hover:bg-line/10">
                      <div>
                        <p className="text-sm font-medium text-ink">{label}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-brand">{fmt(inc)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-action">{fmt(exp)}</p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-bold ${net >= 0 ? "text-success" : "text-sos"}`}
                        >
                          {net >= 0 ? fmt(net) : `−${fmt(Math.abs(net))}`}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Grand total row */}
                <div className="grid grid-cols-4 gap-1 border-t-2 border-line bg-surface px-4 py-4">
                  <div>
                    <p className="text-sm font-bold text-ink">All Time</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-brand">{fmt(grandInc)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-action">{fmt(grandExp)}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-base font-bold ${grandNet >= 0 ? "text-success" : "text-sos"}`}
                    >
                      {grandNet >= 0 ? fmt(grandNet) : `−${fmt(Math.abs(grandNet))}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary card */}
              <Card className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Overall Summary
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-brand/10 px-3 py-3 text-center">
                    <p className="text-xs font-medium text-brand mb-1">Total Income</p>
                    <p className="text-lg font-bold text-brand">{fmt(grandInc)}</p>
                  </div>
                  <div className="rounded-xl bg-action/10 px-3 py-3 text-center">
                    <p className="text-xs font-medium text-action mb-1">Total Expenses</p>
                    <p className="text-lg font-bold text-action">{fmt(grandExp)}</p>
                  </div>
                  <div
                    className={`rounded-xl px-3 py-3 text-center ${grandNet >= 0 ? "bg-success/10" : "bg-sos/10"}`}
                  >
                    <p className={`text-xs font-medium mb-1 ${grandNet >= 0 ? "text-success" : "text-sos"}`}>
                      Net Income
                    </p>
                    <p className={`text-lg font-bold ${grandNet >= 0 ? "text-success" : "text-sos"}`}>
                      {grandNet >= 0 ? fmt(grandNet) : `−${fmt(Math.abs(grandNet))}`}
                    </p>
                  </div>
                </div>
                <p className="text-center text-xs text-ink-muted">
                  Total Income − Total Expenses = Net Income
                </p>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
