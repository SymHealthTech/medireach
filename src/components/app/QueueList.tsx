"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Role } from "@/lib/constants";

export interface QueueEntry {
  visitId: string;
  patientId: string | null;
  name: string;
  mobile: string;
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
  referredBy: string;
  emergencyContact: string;
  allergicTo: string;
  bp: string;
  weightKg: string;
  heightCm: string;
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
    referredBy: "",
    emergencyContact: "",
    allergicTo: "",
    bp: "",
    weightKg: "",
    heightCm: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof EditForm>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!entry.patientId) return;
    setError(null);
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {};
      if (form.name.trim()) payload.name = form.name.trim();
      if (form.mobile.trim()) payload.mobile = form.mobile.trim();
      if (form.address.trim()) payload.address = form.address.trim();
      if (form.gender) payload.gender = form.gender;
      if (form.ageYears.trim()) payload.ageYears = Number(form.ageYears);
      if (form.referredBy.trim()) payload.referredBy = form.referredBy.trim();
      if (form.emergencyContact.trim()) payload.emergencyContact = form.emergencyContact.trim();
      if (form.allergicTo.trim()) payload.allergicTo = form.allergicTo.trim();
      if (form.bp.trim()) payload.bp = form.bp.trim();
      if (form.weightKg.trim()) payload.weightKg = Number(form.weightKg);
      if (form.heightCm.trim()) payload.heightCm = Number(form.heightCm);

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-ink">Edit patient details</h2>

        {error && (
          <p className="mb-3 rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos">{error}</p>
        )}

        <form onSubmit={submit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="edit-name">Full name</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="edit-mobile">Mobile number</Label>
              <Input
                id="edit-mobile"
                inputMode="numeric"
                value={form.mobile}
                onChange={(e) => set("mobile", e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-gender">Gender</Label>
              <select
                id="edit-gender"
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
                className="h-12 w-full rounded-xl border border-line bg-surface-raised px-3.5 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <option value="">— unchanged —</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="edit-age">Age (years)</Label>
              <Input
                id="edit-age"
                inputMode="numeric"
                placeholder="— unchanged —"
                value={form.ageYears}
                onChange={(e) => set("ageYears", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-referred">Referred by</Label>
              <Input
                id="edit-referred"
                placeholder="— unchanged —"
                value={form.referredBy}
                onChange={(e) => set("referredBy", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                placeholder="— unchanged —"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>
          </div>

          <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <legend className="mb-2 text-sm font-semibold text-ink">Vitals &amp; intake</legend>
            <div>
              <Label htmlFor="edit-bp">BP</Label>
              <Input
                id="edit-bp"
                placeholder="120/80"
                value={form.bp}
                onChange={(e) => set("bp", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-weight">Weight (kg)</Label>
              <Input
                id="edit-weight"
                inputMode="decimal"
                placeholder="—"
                value={form.weightKg}
                onChange={(e) => set("weightKg", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-height">Height (cm)</Label>
              <Input
                id="edit-height"
                inputMode="decimal"
                placeholder="—"
                value={form.heightCm}
                onChange={(e) => set("heightCm", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-ec">Emergency contact</Label>
              <Input
                id="edit-ec"
                inputMode="numeric"
                placeholder="—"
                value={form.emergencyContact}
                onChange={(e) => set("emergencyContact", e.target.value)}
              />
            </div>
            <div className="col-span-2 sm:col-span-4">
              <Label htmlFor="edit-allergic">Allergic to</Label>
              <Input
                id="edit-allergic"
                placeholder="— unchanged —"
                value={form.allergicTo}
                onChange={(e) => set("allergicTo", e.target.value)}
              />
            </div>
          </fieldset>

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
        {entries.map((e) => {
          const examined = e.status === "confirmed";
          const clickable = role === "doctor" || (role === "receptionist" && !examined);

          return (
            <li
              key={e.visitId}
              className={cn(
                "flex items-center justify-between rounded-2xl border border-line bg-surface-raised p-4",
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
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-ink">{e.name}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      e.type === "follow-up" ? "bg-brand/10 text-brand" : "bg-action/15 text-action",
                    )}
                  >
                    {e.type === "follow-up" ? "Follow-up" : "New"}
                  </span>
                  {examined && (
                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                      Seen
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink-muted">{e.mobile}</p>
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
