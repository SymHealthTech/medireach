"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { MedicineEditor, type MedicineRow } from "@/components/app/MedicineEditor";
import { apiGet, apiPost } from "@/lib/client/api";
import { useRecorder } from "@/lib/client/recorder";
import { uploadSigned } from "@/lib/client/upload";
import { buildPrescriptionText } from "@/lib/prescription";
import { renderPrescriptionImage } from "@/lib/client/prescriptionImage";
import { sharePrescription } from "@/lib/client/share";

interface OE {
  bp?: string; weight?: string; height?: string; pulse?: string; temp?: string;
  rr?: string; pa?: string; cvs?: string; cns?: string; bsl?: string;
}
interface FormState {
  ho: string; fh: string; co: string; oe: OE; notes: string;
  provisionalDiagnosis: string; diagnosis: string;
  medicines: MedicineRow[]; fees: string; reportPublicIds: string[];
}
const OE_FIELDS: { key: keyof OE; label: string }[] = [
  { key: "bp", label: "BP" }, { key: "weight", label: "Weight" }, { key: "height", label: "Height" },
  { key: "pulse", label: "Pulse" }, { key: "temp", label: "Temp" }, { key: "rr", label: "RR" },
  { key: "pa", label: "P/A" }, { key: "cvs", label: "CVS" }, { key: "cns", label: "CNS" }, { key: "bsl", label: "BSL" },
];

const emptyForm: FormState = {
  ho: "", fh: "", co: "", oe: {}, notes: "", provisionalDiagnosis: "", diagnosis: "",
  medicines: [], fees: "", reportPublicIds: [],
};

/**
 * Doctor consultation screen (spec §7.3–7.5). Voice-first: dictate → Whisper →
 * Claude structures into the fields below → doctor reviews & edits → Confirm
 * (the safety gate; nothing finalizes before it) → Save / Send on WhatsApp.
 */
export default function ConsultPage() {
  const { visitId } = useParams<{ visitId: string }>();
  const router = useRouter();
  const recorder = useRecorder();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [patient, setPatient] = useState<{ name: string; ageYears?: number; gender?: string } | null>(null);
  const [clinic, setClinic] = useState<{
    clinicName: string; clinicAddress: string; clinicTimings: string;
    doctorName: string; degree: string; registrationNumber: string;
  } | null>(null);
  const [tpl, setTpl] = useState<{
    presetKey: string; logoPlacement: "left" | "center" | "right";
    footer?: { storeName?: string; storeAddress?: string; storeContact?: string };
  } | null>(null);
  const [status, setStatus] = useState<"draft" | "confirmed">("draft");
  const [aiState, setAiState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiGet<{ visit: Record<string, unknown>; patient: Record<string, unknown> }>(`/api/visits/${visitId}`)
      .then(({ visit, patient }) => {
        setForm({
          ho: (visit.ho as string) ?? "",
          fh: (visit.fh as string) ?? "",
          co: (visit.co as string) ?? "",
          oe: (visit.oe as OE) ?? {},
          notes: (visit.notes as string) ?? "",
          provisionalDiagnosis: (visit.provisionalDiagnosis as string) ?? "",
          diagnosis: (visit.diagnosis as string) ?? "",
          medicines: (visit.medicines as MedicineRow[]) ?? [],
          fees: visit.fees != null ? String(visit.fees) : "",
          reportPublicIds: (visit.reportPublicIds as string[]) ?? [],
        });
        setStatus((visit.status as "draft" | "confirmed") ?? "draft");
        if (patient) setPatient({ name: patient.name as string, ageYears: patient.ageYears as number, gender: patient.gender as string });
      })
      .catch((e) => setError((e as Error).message));
    // Template + clinic info for rendering the prescription on share.
    apiGet<{ template: typeof tpl; clinic: typeof clinic }>("/api/template")
      .then((d) => {
        setTpl(d.template);
        setClinic(d.clinic);
      })
      .catch(() => {});
  }, [visitId]);

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function setOE(key: keyof OE, v: string) {
    setForm((f) => ({ ...f, oe: { ...f.oe, [key]: v } }));
  }

  const buildPayload = useCallback(
    () => ({
      ho: form.ho || undefined,
      fh: form.fh || undefined,
      co: form.co || undefined,
      oe: form.oe,
      notes: form.notes || undefined,
      provisionalDiagnosis: form.provisionalDiagnosis || undefined,
      diagnosis: form.diagnosis || undefined,
      medicines: form.medicines.filter((m) => m.name.trim()),
      fees: form.fees ? Number(form.fees) : undefined,
      reportPublicIds: form.reportPublicIds,
    }),
    [form],
  );

  async function handleDictation() {
    setError(null);
    if (recorder.recording) {
      setAiState("Transcribing…");
      const blob = await recorder.stop();
      if (!blob) {
        setAiState(null);
        return;
      }
      try {
        const fd = new FormData();
        fd.append("audio", blob, "dictation.webm");
        const tr = await fetch("/api/transcribe", { method: "POST", body: fd });
        const trData = await tr.json();
        if (!tr.ok) throw new Error(trData.error ?? "Transcription failed.");
        setAiState("Structuring…");
        const { structured } = await apiPost<{ structured: Record<string, unknown> }>("/api/structure", {
          transcript: trData.text,
        });
        mergeStructured(structured);
        setAiState(null);
      } catch (e) {
        setError((e as Error).message);
        setAiState(null);
      }
    } else {
      await recorder.start();
    }
  }

  function mergeStructured(s: Record<string, unknown>) {
    setForm((f) => ({
      ...f,
      ho: (s.ho as string) || f.ho,
      fh: (s.fh as string) || f.fh,
      co: (s.co as string) || f.co,
      oe: { ...f.oe, ...((s.oe as OE) ?? {}) },
      notes: (s.notes as string) || f.notes,
      provisionalDiagnosis: (s.provisionalDiagnosis as string) || f.provisionalDiagnosis,
      diagnosis: (s.diagnosis as string) || f.diagnosis,
      medicines: Array.isArray(s.medicines) && (s.medicines as MedicineRow[]).length
        ? (s.medicines as MedicineRow[])
        : f.medicines,
      fees: s.fees != null ? String(s.fees) : f.fees,
    }));
  }

  async function uploadReport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { publicId } = await uploadSigned(file, "report");
      setField("reportPublicIds", [...form.reportPublicIds, publicId]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/visits/${visitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not save.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await apiPost(`/api/visits/${visitId}/confirm`, buildPayload());
      setStatus("confirmed");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function shareWhatsApp() {
    const c = clinic ?? {
      clinicName: "", clinicAddress: "", clinicTimings: "",
      doctorName: "", degree: "", registrationNumber: "",
    };
    const meds = form.medicines.filter((m) => m.patientText);
    const text = buildPrescriptionText(
      { name: c.doctorName, registrationNumber: c.registrationNumber, clinicName: c.clinicName, clinicAddress: c.clinicAddress },
      patient ?? { name: "Patient" },
      { diagnosis: form.diagnosis, medicines: meds, date: new Date() },
    );
    try {
      const image = await renderPrescriptionImage({
        presetKey: tpl?.presetKey ?? "classic",
        logoPlacement: tpl?.logoPlacement ?? "left",
        clinicName: c.clinicName || "Clinic",
        clinicAddress: c.clinicAddress,
        doctorName: c.doctorName,
        registrationNumber: c.registrationNumber,
        degree: c.degree,
        clinicTimings: c.clinicTimings,
        patientName: patient?.name ?? "Patient",
        patientMeta: `${patient?.gender ?? ""}${patient?.ageYears ? ` · ${patient.ageYears}y` : ""}`,
        date: new Date().toLocaleDateString("en-IN"),
        diagnosis: form.diagnosis || undefined,
        medicines: meds.map((m) => m.patientText),
        footer: tpl?.footer,
      });
      await sharePrescription(image, text);
    } catch {
      // Image generation/share failed → fall back to text-only share.
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{patient?.name ?? "Consultation"}</h1>
          {patient && (
            <p className="text-sm text-ink-muted">
              {patient.gender}
              {patient.ageYears ? ` · ${patient.ageYears}y` : ""}
            </p>
          )}
        </div>
        <button onClick={() => router.push("/app/queue")} className="text-sm text-ink-muted hover:underline">
          ← Queue
        </button>
      </div>

      {error && <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos" role="alert">{error}</p>}

      {status === "confirmed" ? (
        <Card className="space-y-4 border-success/40 bg-success/5">
          <p className="font-semibold text-success">✓ Visit confirmed and saved.</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" size="lg" onClick={shareWhatsApp}>
              Send on WhatsApp
            </Button>
            <Button variant="ghost" size="lg" onClick={() => router.push("/app/queue")}>
              Done
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-ink">Dictate the consultation</p>
            <p className="text-sm text-ink-muted">
              {recorder.recording ? "Recording… tap stop when done." : aiState ?? "Speak naturally; AI fills the fields."}
            </p>
          </div>
          <Button
            variant={recorder.recording ? "danger" : "brand"}
            size="lg"
            onClick={handleDictation}
            disabled={!!aiState || !recorder.supported}
          >
            {recorder.recording ? "■ Stop" : aiState ? "…" : "🎤 Dictate"}
          </Button>
        </Card>
      )}
      {!recorder.supported && (
        <p className="text-sm text-ink-muted">Voice capture isn&apos;t supported on this browser — type the fields below.</p>
      )}

      <div className="space-y-4">
        <Field label="H/O — History of present illness" value={form.ho} onChange={(v) => setField("ho", v)} />
        <Field label="F/H — Family history" value={form.fh} onChange={(v) => setField("fh", v)} />
        <Field label="C/O — Complaints of" value={form.co} onChange={(v) => setField("co", v)} />

        <Card className="space-y-3">
          <p className="text-sm font-semibold text-ink">O/E — On examination</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {OE_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <Label htmlFor={`oe-${key}`}>{label}</Label>
                <Input id={`oe-${key}`} value={form.oe[key] ?? ""} onChange={(e) => setOE(key, e.target.value)} />
              </div>
            ))}
          </div>
        </Card>

        <Field label="Notes" value={form.notes} onChange={(v) => setField("notes", v)} />
        <Field label="Provisional diagnosis" value={form.provisionalDiagnosis} onChange={(v) => setField("provisionalDiagnosis", v)} />
        <Field label="Diagnosis" value={form.diagnosis} onChange={(v) => setField("diagnosis", v)} />

        <Card className="space-y-3">
          <p className="text-sm font-semibold text-ink">Medicines</p>
          <MedicineEditor medicines={form.medicines} onChange={(m) => setField("medicines", m)} />
        </Card>

        <Card className="space-y-3">
          <p className="text-sm font-semibold text-ink">Scan &amp; save reports</p>
          <input type="file" accept="image/*" capture="environment" onChange={uploadReport} disabled={busy}
            className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:text-brand-fg" />
          {form.reportPublicIds.length > 0 && (
            <p className="text-sm text-success">{form.reportPublicIds.length} report(s) attached.</p>
          )}
        </Card>

        <div className="max-w-[12rem]">
          <Label htmlFor="fees">Fees (₹)</Label>
          <Input id="fees" inputMode="numeric" value={form.fees} onChange={(e) => setField("fees", e.target.value)} />
        </div>
      </div>

      {status === "draft" && (
        <div className="sticky bottom-20 flex gap-3 rounded-2xl border border-line bg-surface-raised p-3 shadow-lg">
          <Button variant="outline" size="lg" onClick={saveDraft} disabled={busy}>
            Save draft
          </Button>
          <Button variant="primary" size="lg" className="flex-1" onClick={confirm} disabled={busy}>
            {busy ? "…" : "Confirm"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
