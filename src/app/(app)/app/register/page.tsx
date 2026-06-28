"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { apiGet, apiPost } from "@/lib/client/api";
import { useMe } from "@/lib/client/useMe";
import { useRecorder } from "@/lib/client/recorder";

interface PatientMatch {
  _id: string;
  name: string;
  mobile: string;
  ageYears?: number;
  address?: string;
  gender?: string;
  allergicTo?: string;
  emergencyContact?: string;
  bp?: string;
  weightKg?: number;
  heightCm?: number;
  temp?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { me } = useMe();

  const [form, setForm] = useState({
    name: params.get("name") ?? "",
    gender: "male",
    ageYears: "",
    mobile: "",
    address: "",
    bp: "",
    weightKg: "",
    heightCm: "",
    temp: "",
    allergicTo: "",
    emergencyContact: "",
  });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const recorder = useRecorder();
  const [aiState, setAiState] = useState<string | null>(null);

  // Duplicate detection
  const [duplicateMatches, setDuplicateMatches] = useState<PatientMatch[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [existingPatientId, setExistingPatientId] = useState<string | null>(null);
  const [existingPatientName, setExistingPatientName] = useState<string | null>(null);
  const dismissedIds = useRef(new Set<string>());
  const dismissedForName = useRef<string>("");
  const nameSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Already-in-queue conflict
  const [showQueueConflictModal, setShowQueueConflictModal] = useState(false);
  const [followUpLoading, setFollowUpLoading] = useState(false);

  useEffect(() => {
    if (nameSearchTimer.current) clearTimeout(nameSearchTimer.current);
    const trimmed = form.name.trim();
    if (trimmed.length < 3 || existingPatientId) return;

    nameSearchTimer.current = setTimeout(async () => {
      try {
        const data = await apiGet<{ patients: PatientMatch[] }>(
          `/api/patients/search?q=${encodeURIComponent(trimmed)}`,
        );
        // Clear dismissed IDs when the new search term is unrelated to the one at dismissal time
        const prev = dismissedForName.current;
        if (prev && !trimmed.startsWith(prev) && !prev.startsWith(trimmed)) {
          dismissedIds.current.clear();
          dismissedForName.current = "";
        }
        const fresh = data.patients.filter((p) => !dismissedIds.current.has(p._id));
        if (fresh.length > 0) {
          setDuplicateMatches(fresh);
          setShowDuplicateModal(true);
        }
      } catch {
        // silent — duplicate detection is best-effort
      }
    }, 500);

    return () => {
      if (nameSearchTimer.current) clearTimeout(nameSearchTimer.current);
    };
  }, [form.name, existingPatientId]);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (k === "name" && existingPatientId) {
      setExistingPatientId(null);
      setExistingPatientName(null);
    }
  }

  function confirmSamePatient(patient: PatientMatch) {
    setExistingPatientId(patient._id);
    setExistingPatientName(patient.name);
    setForm((f) => ({
      ...f,
      name: patient.name,
      mobile: patient.mobile,
      gender: patient.gender ?? f.gender,
      ageYears: patient.ageYears != null ? String(patient.ageYears) : f.ageYears,
      address: patient.address ?? f.address,
      allergicTo: patient.allergicTo ?? f.allergicTo,
      emergencyContact: patient.emergencyContact ?? f.emergencyContact,
      // Vitals are always entered fresh — do not carry over from prior visit
      bp: "",
      weightKg: "",
      heightCm: "",
      temp: "",
    }));
    setConsent(true);
    setShowDuplicateModal(false);
    setDuplicateMatches([]);
  }

  function dismissDuplicateModal() {
    duplicateMatches.forEach((p) => dismissedIds.current.add(p._id));
    dismissedForName.current = form.name.trim();
    setShowDuplicateModal(false);
    setDuplicateMatches([]);
  }

  function resetForm() {
    setForm({
      name: "",
      gender: "male",
      ageYears: "",
      mobile: "",
      address: "",
      bp: "",
      weightKg: "",
      heightCm: "",
      temp: "",
      allergicTo: "",
      emergencyContact: "",
    });
    setExistingPatientId(null);
    setExistingPatientName(null);
    setConsent(false);
    setShowQueueConflictModal(false);
    dismissedIds.current.clear();
    dismissedForName.current = "";
  }

  async function addAsFollowUp() {
    if (!existingPatientId) return;
    setFollowUpLoading(true);
    try {
      const { visitId } = await apiPost<{ visitId: string }>("/api/queue", {
        patientId: existingPatientId,
        type: "follow-up",
      });
      if (me?.role === "doctor") router.push(`/app/consult/${visitId}`);
      else router.push("/app/queue");
    } catch (err) {
      setShowQueueConflictModal(false);
      setError((err as Error).message);
    } finally {
      setFollowUpLoading(false);
    }
  }

  async function handleDictation() {
    setError(null);
    if (recorder.recording) {
      setAiState("Transcribing…");
      const blob = await recorder.stop();
      if (!blob) { setAiState(null); return; }
      try {
        const fd = new FormData();
        fd.append("audio", blob, "patient.webm");
        const tr = await fetch("/api/transcribe", { method: "POST", body: fd });
        const trData = await tr.json();
        if (!tr.ok) throw new Error(trData.error ?? "Transcription failed.");
        setAiState("Reading details…");
        const { structured } = await apiPost<{ structured: Record<string, unknown> }>(
          "/api/patients/structure",
          { transcript: trData.text },
        );
        setForm((f) => ({
          ...f,
          name: (structured.name as string) || f.name,
          ageYears: structured.ageYears != null ? String(structured.ageYears) : f.ageYears,
          gender: (structured.gender as string) || f.gender,
          mobile: (structured.mobile as string) || f.mobile,
          address: (structured.address as string) || f.address,
          allergicTo: (structured.allergicTo as string) || f.allergicTo,
        }));
        setAiState(null);
      } catch (err) {
        setError((err as Error).message);
        setAiState(null);
      }
    } else {
      await recorder.start();
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!consent && !existingPatientId) {
      setError("Please confirm the patient has consented before saving.");
      return;
    }
    setLoading(true);
    try {
      let visitId: string;
      if (existingPatientId) {
        const result = await apiPost<{ visitId: string }>("/api/queue", {
          patientId: existingPatientId,
          type: "new",
          bp: form.bp || undefined,
          weightKg: form.weightKg ? Number(form.weightKg) : undefined,
          heightCm: form.heightCm ? Number(form.heightCm) : undefined,
          temp: form.temp || undefined,
        });
        visitId = result.visitId;
      } else {
        const payload = {
          name: form.name,
          gender: form.gender,
          ageYears: form.ageYears ? Number(form.ageYears) : undefined,
          mobile: form.mobile,
          address: form.address || undefined,
          bp: form.bp || undefined,
          weightKg: form.weightKg ? Number(form.weightKg) : undefined,
          heightCm: form.heightCm ? Number(form.heightCm) : undefined,
          temp: form.temp || undefined,
          allergicTo: form.allergicTo || undefined,
          emergencyContact: form.emergencyContact || undefined,
          visitType: "new" as const,
          consent: true as const,
        };
        const result = await apiPost<{ visitId: string }>("/api/patients", payload);
        visitId = result.visitId;
      }
      if (me?.role === "doctor") router.push(`/app/consult/${visitId}`);
      else router.push("/app/queue");
    } catch (err) {
      const msg = (err as Error).message;
      if (existingPatientId && msg.toLowerCase().includes("already has a new entry")) {
        setShowQueueConflictModal(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 lg:mx-8">
      <h1 className="text-2xl font-bold text-ink">Register patient</h1>

      {error && (
        <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos" role="alert">
          {error}
        </p>
      )}

      {/* Duplicate detection modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface shadow-xl">
            <div className="border-b border-line p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-ink">Patient already on record?</h2>
                <button onClick={dismissDuplicateModal} className="text-lg text-ink-muted hover:text-sos" aria-label="Close">✕</button>
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                {duplicateMatches.length === 1
                  ? "A patient with this name was found in your records."
                  : `${duplicateMatches.length} patients with this name were found.`}{" "}
                Is this the same person?
              </p>
            </div>

            <ul className="max-h-72 divide-y divide-line overflow-y-auto">
              {duplicateMatches.map((p) => (
                <li key={p._id} className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{p.name}</p>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {p.mobile}
                      {p.ageYears ? ` · ${p.ageYears} yrs` : ""}
                      {p.gender ? ` · ${p.gender}` : ""}
                    </p>
                    {p.address && (
                      <p className="mt-0.5 truncate text-xs text-ink-muted">{p.address}</p>
                    )}
                  </div>
                  <Button
                    variant="brand"
                    size="sm"
                    className="shrink-0"
                    onClick={() => confirmSamePatient(p)}
                  >
                    Yes, same patient
                  </Button>
                </li>
              ))}
            </ul>

            <div className="border-t border-line p-4">
              <Button
                variant="ghost"
                size="md"
                className="w-full"
                onClick={dismissDuplicateModal}
              >
                No — this is a different patient
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Already-in-queue conflict modal */}
      {showQueueConflictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface shadow-xl">
            <div className="border-b border-line p-5">
              <h2 className="text-lg font-bold text-ink">Already in today&apos;s queue</h2>
              <p className="mt-1 text-sm text-ink-muted">
                <span className="font-semibold text-ink">{existingPatientName}</span> already has a
                new entry in today&apos;s queue. Would you like to add them as a follow-up instead?
              </p>
            </div>
            <div className="flex flex-col gap-2 p-4">
              <Button
                variant="brand"
                size="lg"
                className="w-full"
                onClick={addAsFollowUp}
                disabled={followUpLoading}
              >
                {followUpLoading ? "Adding…" : "Add as follow-up"}
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full"
                onClick={resetForm}
                disabled={followUpLoading}
              >
                Cancel — clear form
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Existing patient banner */}
      {existingPatientId && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-brand/30 bg-brand/10 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5 shrink-0 text-brand"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clipRule="evenodd"
              />
            </svg>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">
                Existing patient: {existingPatientName}
              </p>
              <p className="text-xs text-ink-muted">
                Details locked — enter today&apos;s vitals (BP, weight, height, temp) and add to queue.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Register as new patient instead"
            onClick={() => {
              setExistingPatientId(null);
              setExistingPatientName(null);
            }}
            className="shrink-0 rounded-lg p-1 text-ink-muted transition-colors hover:bg-brand/10 hover:text-ink"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      )}

      {me?.role === "doctor" && (
        <Card className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-ink">Add by voice</p>
            <p className="text-sm text-ink-muted">
              {recorder.recording
                ? "Recording… say the name, age, mobile, address, allergies — then stop."
                : aiState ?? "Speak the patient's details; review the fields below before saving."}
            </p>
          </div>
          <Button
            type="button"
            variant={recorder.recording ? "danger" : "brand"}
            size="lg"
            onClick={handleDictation}
            disabled={!!aiState || !recorder.supported}
          >
            {recorder.recording ? "■ Stop" : aiState ? "…" : "🎤 Dictate"}
          </Button>
        </Card>
      )}
      {me?.role === "doctor" && !recorder.supported && (
        <p className="text-sm text-ink-muted">
          Voice capture isn&apos;t supported on this browser — type the details below.
        </p>
      )}

      <Card>
        <form onSubmit={submit} className="space-y-3">

          {/* Row 1: Name · Gender · Age */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
                autoFocus
                autoComplete="off"
                disabled={!!existingPatientId}
              />
            </div>
            <div className="lg:w-40">
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
                disabled={!!existingPatientId}
                className="h-12 w-full rounded-xl border border-line bg-surface-raised px-3.5 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="lg:w-28">
              <Label htmlFor="age">Age (years)</Label>
              <Input
                id="age"
                inputMode="numeric"
                value={form.ageYears}
                onChange={(e) => set("ageYears", e.target.value)}
                disabled={!!existingPatientId}
              />
            </div>
          </div>

          {/* Row 2: Mobile · Address */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="w-full lg:w-1/3">
              <Label htmlFor="mobile">Mobile number</Label>
              <Input
                id="mobile"
                inputMode="numeric"
                value={form.mobile}
                onChange={(e) => set("mobile", e.target.value)}
                disabled={!!existingPatientId}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                disabled={!!existingPatientId}
              />
            </div>
          </div>

          {/* Row 3: Vitals */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1">
              <Label htmlFor="bp">BP</Label>
              <Input
                id="bp"
                placeholder="120/80"
                value={form.bp}
                onChange={(e) => set("bp", e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                inputMode="decimal"
                value={form.weightKg}
                onChange={(e) => set("weightKg", e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                inputMode="decimal"
                value={form.heightCm}
                onChange={(e) => set("heightCm", e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="temp">Temp (°F)</Label>
              <Input
                id="temp"
                inputMode="decimal"
                value={form.temp}
                onChange={(e) => set("temp", e.target.value)}
              />
            </div>
          </div>

          {/* Row 4: Allergic to · Emergency contact */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1">
              <Label htmlFor="allergic">Allergic to</Label>
              <Input
                id="allergic"
                value={form.allergicTo}
                onChange={(e) => set("allergicTo", e.target.value)}
                disabled={!!existingPatientId}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="ec">Emergency contact</Label>
              <Input
                id="ec"
                inputMode="numeric"
                value={form.emergencyContact}
                onChange={(e) => set("emergencyContact", e.target.value)}
                disabled={!!existingPatientId}
              />
            </div>
          </div>

          {!existingPatientId && (
            <label className="flex items-start gap-3 rounded-xl bg-surface p-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[#0E7C7B]"
              />
              <span>
                The patient consents to MediReach storing their personal and health information to
                provide care, in line with the{" "}
                <a href="/privacy-policy" target="_blank" className="text-brand underline">
                  Privacy Policy
                </a>
                . Consent can be withdrawn at any time.
              </span>
            </label>
          )}

          <div className="flex gap-3">
            <Button type="submit" variant="brand" size="lg" disabled={loading}>
              {loading ? "Saving…" : existingPatientId ? "Add to queue" : "Save & add to queue"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => router.push("/app/queue")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
