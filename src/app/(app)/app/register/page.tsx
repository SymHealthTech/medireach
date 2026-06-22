"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { apiPost } from "@/lib/client/api";
import { useMe } from "@/lib/client/useMe";
import { useRecorder } from "@/lib/client/recorder";

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

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consent) {
      setError("Please confirm the patient has consented before saving.");
      return;
    }
    setLoading(true);
    try {
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
      const { visitId } = await apiPost<{ visitId: string }>("/api/patients", payload);
      if (me?.role === "doctor") router.push(`/app/consult/${visitId}`);
      else router.push("/app/queue");
    } catch (err) {
      setError((err as Error).message);
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
              <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} required autoFocus />
            </div>
            <div className="lg:w-40">
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
                className="h-12 w-full rounded-xl border border-line bg-surface-raised px-3.5 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="lg:w-28">
              <Label htmlFor="age">Age (years)</Label>
              <Input id="age" inputMode="numeric" value={form.ageYears} onChange={(e) => set("ageYears", e.target.value)} />
            </div>
          </div>

          {/* Row 2: Mobile (1/3) · Address (2/3) */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="w-full lg:w-1/3">
              <Label htmlFor="mobile">Mobile number</Label>
              <Input id="mobile" inputMode="numeric" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} required />
            </div>
            <div className="flex-1">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} />
            </div>
          </div>

          {/* Row 3: Vitals */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1">
              <Label htmlFor="bp">BP</Label>
              <Input id="bp" placeholder="120/80" value={form.bp} onChange={(e) => set("bp", e.target.value)} />
            </div>
            <div className="flex-1">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input id="weight" inputMode="decimal" value={form.weightKg} onChange={(e) => set("weightKg", e.target.value)} />
            </div>
            <div className="flex-1">
              <Label htmlFor="height">Height (cm)</Label>
              <Input id="height" inputMode="decimal" value={form.heightCm} onChange={(e) => set("heightCm", e.target.value)} />
            </div>
            <div className="flex-1">
              <Label htmlFor="temp">Temp (°F)</Label>
              <Input id="temp" inputMode="decimal" value={form.temp} onChange={(e) => set("temp", e.target.value)} />
            </div>
          </div>

          {/* Row 4: Allergic to · Emergency contact */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1">
              <Label htmlFor="allergic">Allergic to</Label>
              <Input id="allergic" value={form.allergicTo} onChange={(e) => set("allergicTo", e.target.value)} />
            </div>
            <div className="flex-1">
              <Label htmlFor="ec">Emergency contact</Label>
              <Input id="ec" inputMode="numeric" value={form.emergencyContact} onChange={(e) => set("emergencyContact", e.target.value)} />
            </div>
          </div>

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

          <div className="flex gap-3">
            <Button type="submit" variant="brand" size="lg" disabled={loading}>
              {loading ? "Saving…" : "Save & add to queue"}
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={() => router.push("/app/queue")}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
