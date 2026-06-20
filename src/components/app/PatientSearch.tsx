"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiGet, apiPost } from "@/lib/client/api";
import type { Role } from "@/lib/constants";

interface Match {
  _id: string;
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

  async function enqueue(patientId: string, type: "new" | "follow-up") {
    try {
      const { visitId } = await apiPost<{ visitId: string }>("/api/queue", { patientId, type });
      if (role === "doctor") router.push(`/app/consult/${visitId}`);
      else {
        setQ("");
        setMatches(null);
        setOpen(false);
        onAdded();
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Search returning patient by name or mobile…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setError(null); }}
            className="h-9"
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
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{m.name}</p>
                      <p className="text-xs text-ink-muted">
                        {m.mobile}
                        {m.ageYears ? ` · ${m.ageYears}y` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button variant="brand" size="sm" onClick={() => enqueue(m._id, "follow-up")}>
                        Follow-up
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => enqueue(m._id, "new")}>
                        New entry
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
