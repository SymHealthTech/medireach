"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { MedicineEditor, type MedicineRow } from "@/components/app/MedicineEditor";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiGet, apiPost } from "@/lib/client/api";
import { useRecorder } from "@/lib/client/recorder";
import { uploadSigned } from "@/lib/client/upload";
import { buildPrescriptionText } from "@/lib/prescription";
import { renderPrescriptionImage } from "@/lib/client/prescriptionImage";
import { sharePrescription } from "@/lib/client/share";

interface OE {
  bp?: string; weight?: string; height?: string; pulse?: string; temp?: string;
  rr?: string; pa?: string; cvs?: string; cns?: string; bsl?: string; lmp?: string;
}
interface FormState {
  ho: string; fh: string; co: string; oe: OE; notes: string;
  provisionalDiagnosis: string; diagnosis: string; followUp: string;
  medicines: MedicineRow[]; fees: string; reportPublicIds: string[];
  adviceGeneral: string; adviceLabTest: string;
  prescriptionLanguage: "english" | "hindi" | "marathi";
}
interface PatientInfo {
  name: string; ageYears?: number; gender?: string;
  mobile?: string; address?: string;
  bp?: string; weightKg?: number; heightCm?: number;
  allergicTo?: string; referredBy?: string; emergencyContact?: string;
}
interface PatientEdits {
  mobile: string; address: string; allergicTo: string; emergencyContact: string;
}

// Row 1: 6 fields — Row 2: 5 fields. Both groups fill full width in their own grid.
const OE_ROW1: { key: keyof OE; label: string }[] = [
  { key: "height", label: "Height" },
  { key: "weight", label: "Weight" },
  { key: "temp",   label: "Temp"   },
  { key: "bp",     label: "BP"     },
  { key: "pulse",  label: "Pulse"  },
  { key: "rr",     label: "RR"     },
];
const OE_ROW2: { key: keyof OE; label: string }[] = [
  { key: "cvs", label: "CVS" },
  { key: "cns", label: "CNS" },
  { key: "pa",  label: "P/A" },
  { key: "bsl", label: "BSL" },
  { key: "lmp", label: "LMP" },
];
const OE_FIELDS = [...OE_ROW1, ...OE_ROW2];

const OE_UNITS: Partial<Record<keyof OE, string>> = {
  temp:  "°F",
  bp:    "mmHg",
  pulse: "/min",
  rr:    "/min",
  bsl:   "mg/dL",
};

function fmtOE(key: keyof OE, value: string | undefined): string {
  if (!value) return "";
  const unit = OE_UNITS[key];
  return unit ? `${value} ${unit}` : value;
}

const emptyForm: FormState = {
  ho: "", fh: "", co: "", oe: {}, notes: "", provisionalDiagnosis: "", diagnosis: "", followUp: "",
  medicines: [], fees: "", reportPublicIds: [],
  adviceGeneral: "", adviceLabTest: "", prescriptionLanguage: "english",
};

export default function ConsultPage() {
  const { visitId } = useParams<{ visitId: string }>();
  const router = useRouter();
  const recorder = useRecorder();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientEdits, setPatientEdits] = useState<PatientEdits>({
    mobile: "", address: "", allergicTo: "", emergencyContact: "",
  });
  const [clinic, setClinic] = useState<{
    clinicName: string; clinicAddress: string; clinicTimings: string;
    doctorName: string; degree: string; registrationNumber: string;
  } | null>(null);
  const [tpl, setTpl] = useState<{
    presetKey: string; logoPlacement: "left" | "center" | "right";
    footer?: { storeName?: string; storeAddress?: string; storeContact?: string };
  } | null>(null);
  const [reportFiles, setReportFiles] = useState<{ name: string; publicId: string }[]>([]);
  const [status, setStatus] = useState<"draft" | "confirmed">("draft");
  const [step, setStep] = useState<"form" | "review">("form");
  const [aiState, setAiState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ visit: Record<string, unknown>; patient: Record<string, unknown> }>(`/api/visits/${visitId}`)
      .then(({ visit, patient: p }) => {
        const visitOe = (visit.oe as OE) ?? {};
        setPatient({
          name: p.name as string,
          ageYears: p.ageYears as number | undefined,
          gender: p.gender as string | undefined,
          mobile: p.mobile as string | undefined,
          address: p.address as string | undefined,
          bp: p.bp as string | undefined,
          weightKg: p.weightKg as number | undefined,
          heightCm: p.heightCm as number | undefined,
          allergicTo: p.allergicTo as string | undefined,
          referredBy: p.referredBy as string | undefined,
          emergencyContact: p.emergencyContact as string | undefined,
        });
        setPatientId(String(p._id));
        setPatientEdits({
          mobile: (p.mobile as string) ?? "",
          address: (p.address as string) ?? "",
          allergicTo: (p.allergicTo as string) ?? "",
          emergencyContact: (p.emergencyContact as string) ?? "",
        });
        setForm({
          ho: (visit.ho as string) ?? "",
          fh: (visit.fh as string) ?? "",
          co: (visit.co as string) ?? "",
          oe: {
            height: visitOe.height || (p.heightCm != null ? String(p.heightCm) + " cm" : ""),
            weight: visitOe.weight || (p.weightKg  != null ? String(p.weightKg)  + " kg" : ""),
            temp:   visitOe.temp   || (p.temp as string | undefined) || "",
            bp:     visitOe.bp     || (p.bp  as string | undefined) || "",
            pulse:  visitOe.pulse  || "",
            rr:     visitOe.rr     || "",
            cvs:    visitOe.cvs    || "",
            cns:    visitOe.cns    || "",
            pa:     visitOe.pa     || "",
            bsl:    visitOe.bsl    || "",
            lmp:    visitOe.lmp    || "",
          },
          notes: (visit.notes as string) ?? "",
          provisionalDiagnosis: (visit.provisionalDiagnosis as string) ?? "",
          diagnosis: (visit.diagnosis as string) ?? "",
          followUp: (visit.followUp as string) ?? "",
          medicines: (visit.medicines as MedicineRow[]) ?? [],
          fees: visit.fees != null ? String(visit.fees) : "",
          reportPublicIds: (visit.reportPublicIds as string[]) ?? [],
          adviceGeneral: (visit.adviceGeneral as string) ?? "",
          adviceLabTest: (visit.adviceLabTest as string) ?? "",
          prescriptionLanguage: (visit.prescriptionLanguage as FormState["prescriptionLanguage"]) ?? "english",
        });
        setStatus((visit.status as "draft" | "confirmed") ?? "draft");
        const existingIds = (visit.reportPublicIds as string[]) ?? [];
        setReportFiles(existingIds.map((id, i) => ({ name: `Report ${i + 1}`, publicId: id })));
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
    apiGet<{ template: typeof tpl; clinic: typeof clinic }>("/api/template")
      .then((d) => { setTpl(d.template); setClinic(d.clinic); })
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
      followUp: form.followUp || undefined,
      medicines: form.medicines.filter((m) => m.name.trim()),
      fees: form.fees ? Number(form.fees) : undefined,
      reportPublicIds: form.reportPublicIds,
      adviceGeneral: form.adviceGeneral || undefined,
      adviceLabTest: form.adviceLabTest || undefined,
      prescriptionLanguage: form.prescriptionLanguage,
    }),
    [form],
  );

  if (loading) return <ConsultSkeleton />;

  async function savePatient() {
    if (!patientId) return;
    await fetch(`/api/patients/${patientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mobile: patientEdits.mobile || undefined,
        address: patientEdits.address || undefined,
        allergicTo: patientEdits.allergicTo || undefined,
        emergencyContact: patientEdits.emergencyContact || undefined,
      }),
    });
  }

  async function handleDictation() {
    setError(null);
    if (recorder.recording) {
      setAiState("Transcribing…");
      const blob = await recorder.stop();
      if (!blob) { setAiState(null); return; }
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
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = "";
    const MAX_MB = 5;
    const oversized = files.filter((f) => f.size > MAX_MB * 1024 * 1024);
    if (oversized.length) {
      setError(`${oversized.map((f) => f.name).join(", ")} exceed${oversized.length === 1 ? "s" : ""} the ${MAX_MB} MB limit. Please compress or scan at a lower resolution.`);
      return;
    }
    setBusy(true);
    try {
      const results = await Promise.all(
        files.map(async (file) => {
          const { publicId } = await uploadSigned(file, "report");
          return { name: file.name, publicId };
        }),
      );
      setReportFiles((prev) => [...prev, ...results]);
      setField("reportPublicIds", [...form.reportPublicIds, ...results.map((r) => r.publicId)]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function removeReport(index: number) {
    const updated = reportFiles.filter((_, i) => i !== index);
    setReportFiles(updated);
    setField("reportPublicIds", updated.map((r) => r.publicId));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/visits/${visitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not save.");
      await savePatient();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveMedicines(medicines: MedicineRow[]) {
    try {
      await fetch(`/api/visits/${visitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...buildPayload(), medicines: medicines.filter((m) => m.name.trim()) }),
      });
    } catch { /* silent — user can still manually save */ }
  }

  async function sendPrescription() {
    setBusy(true);
    setError(null);
    try {
      await Promise.all([
        apiPost(`/api/visits/${visitId}/confirm`, buildPayload()),
        savePatient(),
      ]);
      setStatus("confirmed");
      await shareWhatsApp();
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
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  }

  // ── Review step ───────────────────────────────────────────────────────────
  if (step === "review") {
    const activeMeds = form.medicines.filter((m) => m.name.trim());
    const oeEntries = OE_FIELDS.filter(({ key }) => form.oe[key]);

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">{patient?.name ?? "Consultation"}</h1>
            {patient && (
              <p className="text-sm text-ink-muted">
                {patient.gender}{patient.ageYears ? ` · ${patient.ageYears}y` : ""}
              </p>
            )}
          </div>
          <button onClick={() => setStep("form")} className="text-sm text-ink-muted hover:underline">
            ← Edit
          </button>
        </div>

        <PatientInfoCard patient={patient} patientEdits={patientEdits} setPatientEdits={setPatientEdits} editable={false} />

        {error && <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos" role="alert">{error}</p>}

        <Card className="space-y-4">
          <p className="font-semibold text-ink">Review Prescription</p>

          {form.co && <ReviewRow label="C/O" value={form.co} />}
          {form.ho && <ReviewRow label="P/H/O" value={form.ho} />}
          {form.fh && <ReviewRow label="F/H" value={form.fh} />}

          {oeEntries.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">O/E</p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                {oeEntries.map(({ key, label }) => (
                  <span key={key} className="text-sm text-ink">
                    <span className="font-medium">{label}:</span> {fmtOE(key, form.oe[key])}
                  </span>
                ))}
              </div>
            </div>
          )}

          {form.provisionalDiagnosis && <ReviewRow label="Provisional Diagnosis" value={form.provisionalDiagnosis} />}
          {form.diagnosis && <ReviewRow label="Diagnosis" value={form.diagnosis} />}
          {form.followUp && <ReviewRow label="Follow Up" value={form.followUp} />}
          {form.notes && <ReviewRow label="Notes" value={form.notes} />}

          {activeMeds.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Medicines</p>
              <ol className="list-decimal pl-4 space-y-0.5">
                {activeMeds.map((m, i) => (
                  <li key={i} className="text-sm text-ink">
                    {m.clinicalText || `${m.name}${m.dosage ? ` ${m.dosage}` : ""}${m.frequency ? ` — ${m.frequency}` : ""}`}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {form.fees && <ReviewRow label="Fees" value={`₹${form.fees}`} />}

          {form.reportPublicIds.length > 0 && (
            <p className="text-sm text-ink-muted">{form.reportPublicIds.length} report(s) attached</p>
          )}

          {form.adviceGeneral && <ReviewRow label="General Advice" value={form.adviceGeneral} />}
          {form.adviceLabTest && <ReviewRow label="Lab Test" value={form.adviceLabTest} />}
          <ReviewRow label="Prescription Language" value={form.prescriptionLanguage.charAt(0).toUpperCase() + form.prescriptionLanguage.slice(1)} />
        </Card>

        <div className="sticky bottom-20 flex gap-3 rounded-2xl border border-line bg-surface-raised p-3 shadow-lg">
          <Button variant="outline" size="lg" onClick={save} disabled={busy}>
            {busy ? "…" : "Save"}
          </Button>
          <Button variant="primary" size="lg" className="flex-1" onClick={sendPrescription} disabled={busy}>
            {busy ? "…" : "Send Prescription"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Form step ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header + Dictate — 50/50 on desktop */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        {/* Left: patient name + queue */}
        <Card className="flex flex-col justify-center">
          <h1 className="text-2xl font-bold text-ink">{patient?.name ?? "Consultation"}</h1>
          {patient && (
            <p className="text-sm text-ink-muted">
              {patient.gender}{patient.ageYears ? ` · ${patient.ageYears}y` : ""}
            </p>
          )}
          <button onClick={() => router.push("/app/queue")} className="mt-1 w-fit text-sm text-ink-muted hover:underline">
            ← Queue
          </button>
        </Card>

        {/* Right: dictate card */}
        {status === "draft" ? (
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
        ) : <div />}
      </div>

      {!recorder.supported && (
        <p className="text-sm text-ink-muted">Voice capture isn&apos;t supported on this browser — type the fields below.</p>
      )}

      {error && <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos" role="alert">{error}</p>}

      {/* Patient info */}
      <PatientInfoCard patient={patient} patientEdits={patientEdits} setPatientEdits={setPatientEdits} />

      {/* Confirmed success banner */}
      {status === "confirmed" && (
        <Card className="space-y-4 border-success/40 bg-success/5">
          <p className="font-semibold text-success">✓ Visit confirmed and saved.</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" size="lg" onClick={shareWhatsApp}>Send on WhatsApp</Button>
            <Button variant="ghost"   size="lg" onClick={() => router.push("/app/queue")}>Done</Button>
          </div>
        </Card>
      )}

      {/* P/H/O · F/H · C/O — one row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[25%_25%_1fr]">
        <TextareaField label="P/H/O — Past history"               value={form.ho} onChange={(v) => setField("ho", v)} />
        <TextareaField label="F/H — Family history"               value={form.fh} onChange={(v) => setField("fh", v)} />
        <TextareaField label="C/O — Complaints of present illness" value={form.co} onChange={(v) => setField("co", v)} />
      </div>

      {/* O/E — On examination */}
      <Card className="space-y-3">
        <p className="text-sm font-semibold text-ink">O/E — On examination</p>
        {/* Row 1: 6 fields */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {OE_ROW1.map(({ key, label }) => (
            <div key={key}>
              <FL htmlFor={`oe-${key}`}>{label}</FL>
              <div className="relative">
                <Input
                  id={`oe-${key}`}
                  value={form.oe[key] ?? ""}
                  onChange={(e) => setOE(key, e.target.value)}
                  className={OE_UNITS[key] && form.oe[key] ? "pr-12" : ""}
                />
                {OE_UNITS[key] && form.oe[key] && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-muted">
                    {OE_UNITS[key]}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        {/* Row 2: 5 fields — own grid so they fill full width */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {OE_ROW2.map(({ key, label }) => (
            <div key={key}>
              <FL htmlFor={`oe-${key}`}>{label}</FL>
              <div className="relative">
                <Input
                  id={`oe-${key}`}
                  value={form.oe[key] ?? ""}
                  onChange={(e) => setOE(key, e.target.value)}
                  className={OE_UNITS[key] && form.oe[key] ? "pr-14" : ""}
                />
                {OE_UNITS[key] && form.oe[key] && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-muted">
                    {OE_UNITS[key]}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Notes (left) · Scan & save reports (right) — 50/50 same height */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        <div className="flex flex-col">
          <FL>Notes</FL>
          <Textarea
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            className="py-3 resize-none overflow-hidden"
            rows={1}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = el.scrollHeight + "px";
            }}
          />
        </div>
        <div className="flex flex-col">
          <FL>Scan &amp; save reports</FL>
          <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface-raised px-3 py-2">
            <div className="flex items-center gap-2">
              <label className="cursor-pointer rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg hover:opacity-90">
                {busy ? "Uploading…" : "+ Browse files"}
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={uploadReport}
                  disabled={busy}
                  className="hidden"
                />
              </label>
              <span className="text-[11px] text-ink-muted">JPG, PNG, PDF · max 5 MB each</span>
            </div>
            {reportFiles.length > 0 && (
              <ul className="space-y-1">
                {reportFiles.map((f, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-surface-raised px-2 py-1 text-xs text-ink">
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removeReport(i)}
                      className="shrink-0 text-ink-muted hover:text-sos"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Provisional Diagnosis · Diagnosis · Follow Up · Fees — one row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div>
          <FL htmlFor="prov-dx">Provisional Diagnosis</FL>
          <Input id="prov-dx" value={form.provisionalDiagnosis}
            onChange={(e) => setField("provisionalDiagnosis", e.target.value)} />
        </div>
        <div>
          <FL htmlFor="dx">Diagnosis</FL>
          <Input id="dx" value={form.diagnosis}
            onChange={(e) => setField("diagnosis", e.target.value)} />
        </div>
        <div>
          <FL htmlFor="follow-up">Follow Up</FL>
          <Input id="follow-up" value={form.followUp} placeholder="e.g. 3 days"
            onChange={(e) => setField("followUp", e.target.value)} />
        </div>
        <div>
          <FL htmlFor="fees">Fees (₹)</FL>
          <Input id="fees" inputMode="numeric" value={form.fees}
            onChange={(e) => setField("fees", e.target.value)} />
        </div>
      </div>

      {/* Medicines */}
      <Card className="space-y-3">
        <p className="text-sm font-semibold text-ink">Medicines</p>
        <MedicineEditor
          medicines={form.medicines}
          onChange={(m) => {
            setField("medicines", m);
            if (m.length < form.medicines.length) saveMedicines(m);
          }}
        />
      </Card>

      {/* Advice */}
      <Card className="space-y-3">
        <p className="text-sm font-semibold text-ink">Advice</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextareaField label="General Advice" value={form.adviceGeneral} onChange={(v) => setField("adviceGeneral", v)} />
          <TextareaField label="Lab Test" value={form.adviceLabTest} onChange={(v) => setField("adviceLabTest", v)} />
        </div>
      </Card>

      {/* Prescription Language + Next */}
      {status === "draft" && (
        <div className="flex items-end gap-4 pt-2">
          <div className="lg:w-[40%]">
            <FL htmlFor="rx-lang">Prescription Language</FL>
            <select
              id="rx-lang"
              value={form.prescriptionLanguage}
              onChange={(e) => setField("prescriptionLanguage", e.target.value as FormState["prescriptionLanguage"])}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="english">English</option>
              <option value="hindi">Hindi</option>
              <option value="marathi">Marathi</option>
            </select>
          </div>
          <Button variant="primary" size="lg" className="flex-1 lg:max-w-[60%]" onClick={() => setStep("review")} disabled={busy}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Patient info card — defined outside ConsultPage to prevent remount on each keystroke ──
function PatientInfoCard({
  patient,
  patientEdits,
  setPatientEdits,
  editable = true,
}: {
  patient: PatientInfo | null;
  patientEdits: PatientEdits;
  setPatientEdits: React.Dispatch<React.SetStateAction<PatientEdits>>;
  editable?: boolean;
}) {
  if (!patient) return null;
  if (editable) {
    return (
      <Card>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <FL htmlFor="pt-mobile">Mobile</FL>
            <Input
              id="pt-mobile"
              inputMode="numeric"
              value={patientEdits.mobile}
              placeholder="–"
              onChange={(e) =>
                setPatientEdits((prev) => ({ ...prev, mobile: e.target.value.replace(/\D/g, "") }))
              }
            />
          </div>
          <div>
            <FL htmlFor="pt-address">Address</FL>
            <Input
              id="pt-address"
              value={patientEdits.address}
              placeholder="–"
              onChange={(e) => setPatientEdits((prev) => ({ ...prev, address: e.target.value }))}
            />
          </div>
          <div>
            <label
              htmlFor="pt-allergic"
              className={`mb-1 block text-[11px] font-semibold uppercase tracking-wide ${patientEdits.allergicTo ? "text-action" : "text-ink-muted"}`}
            >
              {patientEdits.allergicTo ? "⚠ Allergic To" : "Allergic To"}
            </label>
            <Input
              id="pt-allergic"
              value={patientEdits.allergicTo}
              placeholder="–"
              className={patientEdits.allergicTo ? "border-action/50 bg-action/5 focus-visible:ring-action" : ""}
              onChange={(e) => setPatientEdits((prev) => ({ ...prev, allergicTo: e.target.value }))}
            />
          </div>
          <div>
            <FL htmlFor="pt-emergency">Emergency Contact</FL>
            <Input
              id="pt-emergency"
              inputMode="numeric"
              value={patientEdits.emergencyContact}
              placeholder="–"
              onChange={(e) =>
                setPatientEdits((prev) => ({ ...prev, emergencyContact: e.target.value.replace(/\D/g, "") }))
              }
            />
          </div>
        </div>
      </Card>
    );
  }
  const items = [
    { label: "Mobile",            value: patientEdits.mobile,        warn: false },
    { label: "Address",           value: patientEdits.address,       warn: false },
    { label: "Allergic To",       value: patientEdits.allergicTo,    warn: true  },
    { label: "Emergency Contact", value: patientEdits.emergencyContact, warn: false },
  ].filter((item) => item.value);
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-line bg-surface-raised px-3 py-2 text-[11px] text-ink-muted">
      <div className="flex flex-wrap gap-x-4 gap-y-0.5">
        {items.map(({ label, value, warn }) => (
          warn ? (
            <span key={label} className="rounded-md bg-action/10 px-1.5 py-0.5 font-semibold text-action">
              ⚠ {label}: {value}
            </span>
          ) : (
            <span key={label}>
              <span className="font-semibold text-ink-subtle">{label}:</span> {value}
            </span>
          )
        ))}
      </div>
    </div>
  );
}

/** Muted, small field label — visually distinct from input text. */
function FL({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted"
    >
      {children}
    </label>
  );
}

/** Textarea field with a muted label — starts at 1 row, auto-expands. */
function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <FL>{label}</FL>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="py-2 resize-none overflow-hidden"
        rows={1}
        onInput={(e) => {
          const el = e.currentTarget;
          el.style.height = "auto";
          el.style.height = el.scrollHeight + "px";
        }}
      />
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="text-sm text-ink whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function ConsultSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-5 w-20 rounded-xl" />
      </div>
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}
