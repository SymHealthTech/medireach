"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { apiGet, apiPost } from "@/lib/client/api";
import { VISIT_PURPOSE_OPTIONS, isCertificatePurpose, isQuickServicePurpose, type Role, type VisitMode } from "@/lib/constants";

interface Match {
  _id: string;
  code?: string;
  name: string;
  mobile: string;
  ageYears?: number;
}

export function PatientSearch({ role, onAdded }: { role: Role; onAdded: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  // The patient whose purpose is being chosen in the modal (null = closed).
  const [picking, setPicking] = useState<Match | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = q.trim();
    if (!trimmed) {
      setMatches(null);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet<{ patients: Match[] }>(
          `/api/patients/search?q=${encodeURIComponent(trimmed)}`,
        );
        setMatches(data.patients);
        setOpen(true);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  async function enqueue(patientId: string, type: "new" | "follow-up", visitMode: VisitMode) {
    try {
      const { visitId } = await apiPost<{ visitId: string }>("/api/queue", { patientId, type, visitMode });
      if (role === "doctor") {
        // Certificate → certificate screen; a quick procedure (nebulisation,
        // dressing, BP checkup, outside injection) → its own procedure form;
        // consultation / follow-up → the full consult.
        if (isCertificatePurpose(visitMode)) {
          router.push(`/app/records/${patientId}/certificate?visitId=${visitId}`);
        } else if (isQuickServicePurpose(visitMode)) {
          router.push(`/app/procedure/${visitId}`);
        } else {
          router.push(`/app/consult/${visitId}`);
        }
      } else {
        setQ("");
        setMatches(null);
        setOpen(false);
        setPicking(null);
        onAdded();
      }
    } catch (err) {
      setError((err as Error).message);
      setPicking(null);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Search patient by name or mobile number"
            value={q}
            onChange={(e) => { setQ(e.target.value); setError(null); }}
            className="h-9 placeholder:text-ink-muted/40"
            autoComplete="off"
          />
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">…</span>
          )}
        </div>
        {q && (
          <button
            type="button"
            onClick={() => { setQ(""); setMatches(null); setOpen(false); setError(null); }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-raised text-ink-muted transition-colors hover:bg-line/50 hover:text-ink"
            aria-label="Clear search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-sos">{error}</p>}

      {open && matches !== null && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          {matches.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-ink-muted">No patient found.</p>
              <Button
                variant="primary"
                size="sm"
                className="mt-2"
                onClick={() => router.push(`/app/register?name=${encodeURIComponent(q)}`)}
              >
                Register new patient
              </Button>
            </div>
          ) : (
            <ul>
              {matches.map((m) => (
                <li key={m._id} className="border-b border-line last:border-0">
                  <button
                    type="button"
                    onClick={() => setPicking(m)}
                    className="flex w-full items-center justify-between gap-2 p-3 text-left transition-colors hover:bg-line/20"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{m.name}</p>
                      <p className="text-xs text-ink-muted">
                        {m.code ? `${m.code} · ` : ""}
                        {m.mobile}
                        {m.ageYears ? ` · ${m.ageYears}y` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg">
                      + Add
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {picking && (
        <PurposeModal
          patient={picking}
          onClose={() => setPicking(null)}
          onConfirm={(type, visitMode) => enqueue(picking._id, type, visitMode)}
        />
      )}
    </div>
  );
}

/**
 * Add-to-queue modal: choose the visit type (new / follow-up) and the purpose
 * (consultation, follow-up, certificate, or a quick procedure) before the
 * patient joins the queue. Opened by tapping a search result.
 */
function PurposeModal({
  patient,
  onClose,
  onConfirm,
}: {
  patient: Match;
  onClose: () => void;
  onConfirm: (type: "new" | "follow-up", visitMode: VisitMode) => void | Promise<void>;
}) {
  const [type, setType] = useState<"new" | "follow-up">("new");
  const [purpose, setPurpose] = useState<VisitMode>("consultation");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  async function add() {
    setBusy(true);
    try {
      await onConfirm(type, purpose);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-t-2xl bg-surface p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-semibold text-ink">Add to queue</p>
            <p className="truncate text-sm text-ink-muted">
              {patient.name}
              {patient.ageYears ? ` · ${patient.ageYears}y` : ""}
            </p>
          </div>
          <button onClick={onClose} className="text-lg text-ink-muted hover:text-sos" aria-label="Close">✕</button>
        </div>

        {/* Type — new vs follow-up entry */}
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-ink-muted">Type</p>
        <div className="mb-4 flex gap-2">
          {([
            { value: "new", label: "New entry" },
            { value: "follow-up", label: "Follow-up" },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={cn(
                "flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                type === opt.value
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-line bg-surface-raised text-ink-muted hover:bg-line/30",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Purpose — the reason for the visit */}
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-ink-muted">Purpose</p>
        <div className="mb-5 grid grid-cols-2 gap-2">
          {VISIT_PURPOSE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPurpose(opt.value)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                purpose === opt.value
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-line bg-surface-raised text-ink-muted hover:bg-line/30",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {isCertificatePurpose(purpose) && (
          <p className="mb-4 -mt-2 text-xs text-ink-muted">
            You&apos;ll go straight to the certificate screen — no full examination needed.
          </p>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" size="lg" className="flex-1" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" size="lg" className="flex-1" onClick={add} disabled={busy}>
            {busy ? "Adding…" : "Add to queue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
