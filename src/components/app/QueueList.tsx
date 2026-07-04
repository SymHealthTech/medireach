"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SpinnerBlock } from "@/components/ui/Spinner";
import { apiGet } from "@/lib/client/api";
import type { Role } from "@/lib/constants";

export interface QueueEntry {
  visitId: string;
  patientId: string | null;
  name: string;
  mobile: string;
  ageYears: number | null;
  gender: string | null;
  type: "new" | "follow-up";
  status: "draft" | "confirmed";
  createdAt: string;
}

interface EditForm {
  name: string;
  mobile: string;
  address: string;
  gender: string;
  ageYears: string;
  emergencyContact: string;
  allergicTo: string;
  bp: string;
  weightKg: string;
  heightCm: string;
  temp: string;
}

function EditModal({
  entry,
  onClose,
  onSaved,
}: {
  entry: QueueEntry;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EditForm>({
    name: entry.name,
    mobile: entry.mobile,
    address: "",
    gender: "",
    ageYears: "",
    emergencyContact: "",
    allergicTo: "",
    bp: "",
    weightKg: "",
    heightCm: "",
    temp: "",
  });
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entry.patientId) { setFetching(false); return; }

    Promise.allSettled([
      apiGet<{ patient: Record<string, unknown> }>(`/api/patients/${entry.patientId}`),
      // Visit fetch is doctor-only; receptionist gets a rejected promise — handled gracefully below
      apiGet<{ visit: { oe?: Record<string, string> } }>(`/api/visits/${entry.visitId}`),
    ]).then(([patientRes, visitRes]) => {
      const oe: Record<string, string> =
        visitRes.status === "fulfilled" ? (visitRes.value.visit?.oe ?? {}) : {};

      if (patientRes.status === "fulfilled") {
        const p = patientRes.value.patient;
        setForm({
          name: (p.name as string) ?? entry.name,
          mobile: (p.mobile as string) ?? entry.mobile,
          address: (p.address as string) ?? "",
          gender: (p.gender as string) ?? "",
          ageYears: p.ageYears != null ? String(p.ageYears) : "",
          emergencyContact: (p.emergencyContact as string) ?? "",
          allergicTo: (p.allergicTo as string) ?? "",
          // Vitals come from today's visit.oe only — never from patient record
          // (patient.bp/etc is an undated snapshot that may be from a prior visit)
          bp: oe.bp || "",
          weightKg: oe.weight ? String(parseFloat(oe.weight)) : "",
          heightCm: oe.height ? String(parseFloat(oe.height)) : "",
          temp: oe.temp || "",
        });
      }
    }).finally(() => setFetching(false));
  }, [entry.patientId, entry.visitId]);

  function set<K extends keyof EditForm>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!entry.patientId) return;
    setError(null);
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        address: form.address.trim(),
      };
      if (form.gender) payload.gender = form.gender;
      if (form.ageYears.trim()) payload.ageYears = Number(form.ageYears);
      if (form.emergencyContact.trim()) payload.emergencyContact = form.emergencyContact.trim();
      if (form.allergicTo.trim()) payload.allergicTo = form.allergicTo.trim();
      if (form.bp.trim()) payload.bp = form.bp.trim();
      if (form.weightKg.trim()) payload.weightKg = Number(form.weightKg);
      if (form.heightCm.trim()) payload.heightCm = Number(form.heightCm);
      if (form.temp.trim()) payload.temp = form.temp.trim();

      const res = await fetch(`/api/patients/${entry.patientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not save changes.");
      }

      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-8"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-surface py-6 shadow-xl">
        <div className="px-8">
          <h2 className="mb-4 text-lg font-semibold text-ink">Edit patient details</h2>
          {error && (
            <p className="mb-3 rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos">{error}</p>
          )}
        </div>

        {fetching ? (
          <SpinnerBlock label="Loading patient details…" />
        ) : (
          /* px-1 on this scroll container gives focus rings room on both sides */
          <div className="max-h-[75vh] overflow-y-auto px-8">
            <form onSubmit={submit} className="space-y-3 pb-1">

              {/* Row 1: Name · Gender · Age */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Label htmlFor="edit-name">Full name</Label>
                  <Input id="edit-name" value={form.name} onChange={(e) => set("name", e.target.value)} required autoFocus />
                </div>
                <div className="sm:w-36">
                  <Label htmlFor="edit-gender">Gender</Label>
                  <select
                    id="edit-gender"
                    value={form.gender}
                    onChange={(e) => set("gender", e.target.value)}
                    className="h-12 w-full rounded-xl border border-line bg-surface-raised px-3.5 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <option value="">— select —</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="sm:w-28">
                  <Label htmlFor="edit-age">Age (years)</Label>
                  <Input id="edit-age" inputMode="numeric" value={form.ageYears} onChange={(e) => set("ageYears", e.target.value)} />
                </div>
              </div>

              {/* Row 2: Mobile (1/3) · Address (2/3) */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="w-full sm:w-1/3">
                  <Label htmlFor="edit-mobile">Mobile number</Label>
                  <Input id="edit-mobile" inputMode="numeric" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} required />
                </div>
                <div className="flex-1">
                  <Label htmlFor="edit-address">Address</Label>
                  <Input id="edit-address" value={form.address} onChange={(e) => set("address", e.target.value)} />
                </div>
              </div>

              {/* Vitals */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-ink">Vitals &amp; intake</p>

                {/* Vitals row 1: BP · Weight · Height · Temp */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Label htmlFor="edit-bp">BP</Label>
                    <Input id="edit-bp" placeholder="120/80" value={form.bp} onChange={(e) => set("bp", e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="edit-weight">Weight (kg)</Label>
                    <Input id="edit-weight" inputMode="decimal" value={form.weightKg} onChange={(e) => set("weightKg", e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="edit-height">Height (cm)</Label>
                    <Input id="edit-height" inputMode="decimal" value={form.heightCm} onChange={(e) => set("heightCm", e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="edit-temp">Temp (°F)</Label>
                    <Input id="edit-temp" inputMode="decimal" value={form.temp} onChange={(e) => set("temp", e.target.value)} />
                  </div>
                </div>

                {/* Vitals row 2: Allergic to · Emergency contact */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Label htmlFor="edit-allergic">Allergic to</Label>
                    <Input id="edit-allergic" value={form.allergicTo} onChange={(e) => set("allergicTo", e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="edit-ec">Emergency contact</Label>
                    <Input id="edit-ec" inputMode="numeric" value={form.emergencyContact} onChange={(e) => set("emergencyContact", e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <Button type="submit" variant="brand" size="lg" disabled={loading}>
                  {loading ? "Saving…" : "Save changes"}
                </Button>
                <Button type="button" variant="ghost" size="lg" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Today's queue list (spec §7.1, §5.2). Behaviour differs by role:
 *  - Doctor: taps a pending entry to open the consultation; confirmed entries
 *    open the saved record (Phase: records).
 *  - Receptionist: pending entries are editable/deletable; confirmed entries
 *    render as disabled, non-clickable rows — visible only to confirm the
 *    patient was seen and to count the day's total (§5.2).
 *
 * Both roles can edit or delete a patient before checkup (status === "draft").
 */
export function QueueList({
  entries,
  role,
  onChanged,
}: {
  entries: QueueEntry[];
  role: Role;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<QueueEntry | null>(null);

  async function remove(visitId: string) {
    if (!confirm("Remove this patient from today's queue?")) return;
    setBusy(visitId);
    try {
      const res = await fetch(`/api/visits/${visitId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Could not remove.");
      } else {
        onChanged();
      }
    } finally {
      setBusy(null);
    }
  }

  if (entries.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line p-8 text-center text-ink-muted">
        No patients in today&apos;s queue yet.
      </p>
    );
  }

  return (
    <>
      {editing && (
        <EditModal
          entry={editing}
          onClose={() => setEditing(null)}
          onSaved={onChanged}
        />
      )}

      <ul className="space-y-2">
        {entries.map((e, idx) => {
          const examined = e.status === "confirmed";
          const clickable = !examined && role === "doctor";

          return (
            <li
              key={e.visitId}
              className={cn(
                "flex items-center justify-between rounded-xl bg-surface-raised px-4 py-3.5 shadow-card transition-shadow dark:shadow-card-dark dark:ring-1 dark:ring-line/70",
                clickable && "hover:shadow-md",
                examined && "opacity-60",
              )}
            >
              <button
                type="button"
                disabled={!clickable}
                onClick={() => {
                  if (role === "doctor") router.push(`/app/consult/${e.visitId}`);
                }}
                className={cn("min-w-0 flex-1 text-left", clickable ? "cursor-pointer" : "cursor-default")}
              >
                <div className="flex items-start gap-3">
                  {/* Queue position in a type-coloured circle — teal for
                      follow-ups, amber for new patients. */}
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold",
                      e.type === "follow-up" ? "bg-brand/12 text-brand" : "bg-action/15 text-action",
                    )}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-ink">{e.name}</span>
                      {examined && (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-success">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                          e.type === "follow-up" ? "bg-brand/10 text-brand" : "bg-action/15 text-action",
                        )}
                      >
                        {e.type === "follow-up" ? "Follow-up" : "New"}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted">
                      {[
                        e.ageYears != null ? `${e.ageYears}y` : null,
                        e.gender ? e.gender.charAt(0).toUpperCase() + e.gender.slice(1) : null,
                      ].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                </div>
              </button>

              {!examined && (
                <div className="ml-3 flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(e)}
                    disabled={busy === e.visitId}
                    className="rounded-lg px-2 py-1 text-sm text-brand hover:bg-brand/10"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(e.visitId)}
                    disabled={busy === e.visitId}
                    className="rounded-lg px-2 py-1 text-sm text-sos hover:bg-sos/10"
                  >
                    {busy === e.visitId ? "…" : "Delete"}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
