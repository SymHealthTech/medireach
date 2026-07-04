"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Skeleton } from "@/components/ui/Skeleton";
import { MedicineEditor, type MedicineRow } from "@/components/app/MedicineEditor";
import { apiGet } from "@/lib/client/api";
import { uploadSigned } from "@/lib/client/upload";

interface OE {
  bp?: string; weight?: string; height?: string; pulse?: string; temp?: string;
  rr?: string; pa?: string; cvs?: string; cns?: string; bsl?: string;
}
interface VisitForm {
  ho: string; fh: string; co: string; oe: OE; notes: string;
  provisionalDiagnosis: string; diagnosis: string; followUp: string; fees: string;
  medicines: MedicineRow[];
  adviceGeneral: string; adviceLabTest: string;
  prescriptionLanguage: "english" | "hindi" | "marathi";
  reportPublicIds: string[];
}
interface PatientForm {
  name: string; gender: string; ageYears: string;
  mobile: string; emergencyContact: string; address: string; allergicTo: string;
}
interface ReportItem {
  publicId: string;
  signedUrl: string;
  date: string;
  visitId: string;
}

const OE_ROW1 = [
  { key: "height" as keyof OE, label: "Height" },
  { key: "weight" as keyof OE, label: "Weight" },
  { key: "temp"   as keyof OE, label: "Temp"   },
  { key: "bp"     as keyof OE, label: "BP"     },
  { key: "pulse"  as keyof OE, label: "Pulse"  },
  { key: "pa"     as keyof OE, label: "P/A"    },
];
const OE_ROW2 = [
  { key: "cvs" as keyof OE, label: "CVS" },
  { key: "cns" as keyof OE, label: "CNS" },
  { key: "rr"  as keyof OE, label: "RR"  },
  { key: "bsl" as keyof OE, label: "BSL" },
];

export default function RecordEditPage() {
  const { patientId, visitId } = useParams<{ patientId: string; visitId: string }>();
  const router = useRouter();

  const [visitForm, setVisitForm] = useState<VisitForm>({
    ho: "", fh: "", co: "", oe: {}, notes: "",
    provisionalDiagnosis: "", diagnosis: "", followUp: "", fees: "",
    medicines: [], adviceGeneral: "", adviceLabTest: "",
    prescriptionLanguage: "english", reportPublicIds: [],
  });
  const [patientForm, setPatientForm] = useState<PatientForm>({
    name: "", gender: "", ageYears: "", mobile: "", emergencyContact: "", address: "", allergicTo: "",
  });
  const [reportFiles, setReportFiles] = useState<{ name: string; publicId: string }[]>([]);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [reportsData, setReportsData] = useState<ReportItem[] | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oeExpanded, setOeExpanded] = useState(false);

  useEffect(() => {
    apiGet<{ visit: Record<string, unknown>; patient: Record<string, unknown> }>(`/api/visits/${visitId}`)
      .then(({ visit, patient }) => {
        const oe = (visit.oe as OE) ?? {};
        const existingIds = (visit.reportPublicIds as string[]) ?? [];
        setVisitForm({
          ho: (visit.ho as string) ?? "",
          fh: (visit.fh as string) ?? "",
          co: (visit.co as string) ?? "",
          oe: {
            height: oe.height || "", weight: oe.weight || "", temp: oe.temp || "",
            bp: oe.bp || "", pulse: oe.pulse || "", pa: oe.pa || "",
            cvs: oe.cvs || "", cns: oe.cns || "", rr: oe.rr || "", bsl: oe.bsl || "",
          },
          notes: (visit.notes as string) ?? "",
          provisionalDiagnosis: (visit.provisionalDiagnosis as string) ?? "",
          diagnosis: (visit.diagnosis as string) ?? "",
          followUp: (visit.followUp as string) ?? "",
          fees: visit.fees != null ? String(visit.fees) : "",
          medicines: (visit.medicines as MedicineRow[]) ?? [],
          adviceGeneral: (visit.adviceGeneral as string) ?? "",
          adviceLabTest: (visit.adviceLabTest as string) ?? "",
          prescriptionLanguage: (visit.prescriptionLanguage as VisitForm["prescriptionLanguage"]) ?? "english",
          reportPublicIds: existingIds,
        });
        setReportFiles(existingIds.map((id, i) => ({ name: `Report ${i + 1}`, publicId: id })));
        setPatientForm({
          name: (patient.name as string) ?? "",
          gender: (patient.gender as string) ?? "",
          ageYears: patient.ageYears != null ? String(patient.ageYears) : "",
          mobile: (patient.mobile as string) ?? "",
          emergencyContact: (patient.emergencyContact as string) ?? "",
          address: (patient.address as string) ?? "",
          allergicTo: (patient.allergicTo as string) ?? "",
        });
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [visitId]);

  async function openReports() {
    setReportsOpen(true);
    if (reportsData !== null) return;
    setReportsLoading(true);
    try {
      const { reports } = await apiGet<{ reports: ReportItem[] }>(`/api/patients/${patientId}/reports`);
      setReportsData(reports);
    } catch {
      setReportsData([]);
    } finally {
      setReportsLoading(false);
    }
  }

  async function deleteReport(report: ReportItem) {
    setDeletingId(report.publicId);
    try {
      const remaining = (reportsData ?? [])
        .filter((r) => r.visitId === report.visitId && r.publicId !== report.publicId)
        .map((r) => r.publicId);

      const res = await fetch(`/api/visits/${report.visitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportPublicIds: remaining }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not delete report.");
      }

      setReportsData((prev) => prev?.filter((r) => r.publicId !== report.publicId) ?? []);

      // Keep the upload list in sync if this report is from the visit being edited
      if (report.visitId === visitId) {
        const nextFiles = reportFiles.filter((f) => f.publicId !== report.publicId);
        setReportFiles(nextFiles);
        setVF("reportPublicIds", nextFiles.map((f) => f.publicId));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  function setVF<K extends keyof VisitForm>(k: K, v: VisitForm[K]) {
    setVisitForm((f) => ({ ...f, [k]: v }));
  }
  function setOE(key: keyof OE, v: string) {
    setVisitForm((f) => ({ ...f, oe: { ...f.oe, [key]: v } }));
  }
  function setPF<K extends keyof PatientForm>(k: K, v: PatientForm[K]) {
    setPatientForm((f) => ({ ...f, [k]: v }));
  }

  async function uploadReport(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = "";
    const oversized = files.filter((f) => f.size > 5 * 1024 * 1024);
    if (oversized.length) {
      setError(`${oversized.map((f) => f.name).join(", ")} exceed${oversized.length === 1 ? "s" : ""} the 5 MB limit.`);
      return;
    }
    setUploadBusy(true);
    try {
      const results = await Promise.all(
        files.map(async (file) => {
          const { publicId } = await uploadSigned(file, "report");
          return { name: file.name, publicId };
        }),
      );
      const next = [...reportFiles, ...results];
      setReportFiles(next);
      setVF("reportPublicIds", next.map((r) => r.publicId));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadBusy(false);
    }
  }

  function removeReport(index: number) {
    const next = reportFiles.filter((_, i) => i !== index);
    setReportFiles(next);
    setVF("reportPublicIds", next.map((r) => r.publicId));
  }

  const buildVisitPayload = useCallback(() => ({
    ho: visitForm.ho || undefined,
    fh: visitForm.fh || undefined,
    co: visitForm.co || undefined,
    oe: visitForm.oe,
    notes: visitForm.notes || undefined,
    provisionalDiagnosis: visitForm.provisionalDiagnosis || undefined,
    diagnosis: visitForm.diagnosis || undefined,
    followUp: visitForm.followUp || undefined,
    adviceGeneral: visitForm.adviceGeneral || undefined,
    adviceLabTest: visitForm.adviceLabTest || undefined,
    prescriptionLanguage: visitForm.prescriptionLanguage,
    medicines: visitForm.medicines.filter((m) => m.name.trim()),
    fees: visitForm.fees ? Number(visitForm.fees) : undefined,
    reportPublicIds: visitForm.reportPublicIds,
  }), [visitForm]);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const [visitRes] = await Promise.all([
        fetch(`/api/visits/${visitId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildVisitPayload()),
        }),
        fetch(`/api/patients/${patientId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: patientForm.name || undefined,
            gender: (patientForm.gender as "male" | "female" | "other") || undefined,
            ageYears: patientForm.ageYears ? Number(patientForm.ageYears) : undefined,
            mobile: patientForm.mobile || undefined,
            emergencyContact: patientForm.emergencyContact || undefined,
            address: patientForm.address || undefined,
            allergicTo: patientForm.allergicTo || undefined,
          }),
        }),
      ]);

      if (!visitRes.ok) {
        const data = await visitRes.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not save changes.");
      }

      router.push(`/app/records/${patientId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <EditSkeleton onBack={() => router.back()} />;

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="text-sm text-ink-muted hover:underline">
            ← Back
          </button>
          <p className="text-xs text-ink-muted">Editing within 3-day window</p>
        </div>

        {error && (
          <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos">{error}</p>
        )}

        {/* Patient Info */}
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-ink">Patient Information</p>

          {/* Row 1: Name · Gender · Age */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <FL htmlFor="pe-name">Full Name</FL>
              <Input id="pe-name" value={patientForm.name}
                onChange={(e) => setPF("name", e.target.value)} />
            </div>
            <div className="sm:w-32">
              <FL htmlFor="pe-gender">Gender</FL>
              <select
                id="pe-gender"
                value={patientForm.gender}
                onChange={(e) => setPF("gender", e.target.value)}
                className="h-12 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="">– select –</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="sm:w-24">
              <FL htmlFor="pe-age">Age (yrs)</FL>
              <Input id="pe-age" inputMode="numeric" value={patientForm.ageYears}
                onChange={(e) => setPF("ageYears", e.target.value.replace(/\D/g, ""))} />
            </div>
          </div>

          {/* Row 2: Mobile · Emergency · Address · Allergic To */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="sm:w-36">
              <FL htmlFor="pe-mobile">Mobile</FL>
              <Input id="pe-mobile" inputMode="numeric" value={patientForm.mobile}
                onChange={(e) => setPF("mobile", e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="sm:w-36">
              <FL htmlFor="pe-ec">Emergency No.</FL>
              <Input id="pe-ec" inputMode="numeric" value={patientForm.emergencyContact}
                onChange={(e) => setPF("emergencyContact", e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="flex-1">
              <FL htmlFor="pe-address">Address</FL>
              <Input id="pe-address" value={patientForm.address}
                onChange={(e) => setPF("address", e.target.value)} />
            </div>
            <div className="flex-1">
              <FL htmlFor="pe-allergic">
                {patientForm.allergicTo ? "⚠ Allergic To" : "Allergic To"}
              </FL>
              <Input
                id="pe-allergic"
                value={patientForm.allergicTo}
                onChange={(e) => setPF("allergicTo", e.target.value)}
                className={patientForm.allergicTo ? "border-action/50 bg-action/5 focus-visible:ring-action" : ""}
              />
            </div>
          </div>
        </Card>

        {/* Clinical fields: P/H/O · F/H · C/O */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_3fr]">
          <AutoTextarea label="P/H/O — Past history"                value={visitForm.ho} onChange={(v) => setVF("ho", v)} />
          <AutoTextarea label="F/H — Family history"                value={visitForm.fh} onChange={(v) => setVF("fh", v)} />
          <AutoTextarea label="C/O — Complaints of present illness" value={visitForm.co} onChange={(v) => setVF("co", v)} />
        </div>

        {/* O/E */}
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-ink">O/E — On examination</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {OE_ROW1.map(({ key, label }) => (
              <div key={key}>
                <FL htmlFor={`oe-${key}`}>{label}</FL>
                <Input id={`oe-${key}`} value={visitForm.oe[key] ?? ""}
                  onChange={(e) => setOE(key, e.target.value)} />
              </div>
            ))}
          </div>
          {oeExpanded && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {OE_ROW2.map(({ key, label }) => (
                <div key={key}>
                  <FL htmlFor={`oe-${key}`}>{label}</FL>
                  <Input id={`oe-${key}`} value={visitForm.oe[key] ?? ""}
                    onChange={(e) => setOE(key, e.target.value)} />
                </div>
              ))}
            </div>
          )}
          <button type="button" onClick={() => setOeExpanded((v) => !v)}
            className="text-xs font-semibold text-brand hover:underline">
            {oeExpanded ? "Show less ▲" : "Show more ▼"}
          </button>
        </Card>

        {/* Notes (left) · Reports (right) — 50/50 same height */}
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          <div className="flex flex-col">
            <FL>Notes</FL>
            <Textarea
              value={visitForm.notes}
              onChange={(e) => setVF("notes", e.target.value)}
              className="flex-1 resize-none overflow-hidden py-3"
              rows={2}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = el.scrollHeight + "px";
              }}
            />
          </div>
          <div className="flex flex-col">
            <FL>Scan &amp; save reports</FL>
            <div className="flex flex-1 flex-col gap-2 rounded-xl border border-line bg-surface-raised px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg hover:opacity-90">
                  {uploadBusy ? "Uploading…" : "+ Browse files"}
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={uploadReport}
                    disabled={uploadBusy}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={openReports}
                  className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-line/30"
                >
                  Show Reports
                </button>
                <span className="text-[11px] text-ink-muted">JPG, PNG, PDF · max 5 MB each</span>
              </div>
              {reportFiles.length > 0 && (
                <ul className="space-y-1">
                  {reportFiles.map((f, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-surface px-2 py-1 text-xs text-ink">
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

        {/* Prov. Dx · Diagnosis · Follow Up · Fees — below notes */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div>
            <FL htmlFor="prov-dx">Provisional Diagnosis</FL>
            <Input id="prov-dx" value={visitForm.provisionalDiagnosis}
              onChange={(e) => setVF("provisionalDiagnosis", e.target.value)} />
          </div>
          <div>
            <FL htmlFor="dx">Diagnosis</FL>
            <Input id="dx" value={visitForm.diagnosis}
              onChange={(e) => setVF("diagnosis", e.target.value)} />
          </div>
          <div>
            <FL htmlFor="follow-up">Follow Up</FL>
            <Input id="follow-up" value={visitForm.followUp} placeholder="e.g. 3 days"
              onChange={(e) => setVF("followUp", e.target.value)} />
          </div>
          <div>
            <FL htmlFor="fees">Fees (₹)</FL>
            <Input id="fees" inputMode="numeric" value={visitForm.fees}
              onChange={(e) => setVF("fees", e.target.value)} />
          </div>
        </div>

        {/* Medicines */}
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-ink">Medicines</p>
          <MedicineEditor
            medicines={visitForm.medicines}
            onChange={(m) => setVF("medicines", m)}
          />
        </Card>

        {/* Advice */}
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-ink">Advice</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AutoTextarea label="General Advice" value={visitForm.adviceGeneral} onChange={(v) => setVF("adviceGeneral", v)} />
            <AutoTextarea label="Lab Test"        value={visitForm.adviceLabTest} onChange={(v) => setVF("adviceLabTest", v)} />
          </div>
        </Card>

        {/* Prescription Language + Save row */}
        <div className="flex items-end gap-3 pb-4">
          <div className="w-[40%]">
            <FL htmlFor="rx-lang">Prescription Language</FL>
            <select
              id="rx-lang"
              value={visitForm.prescriptionLanguage}
              onChange={(e) => setVF("prescriptionLanguage", e.target.value as VisitForm["prescriptionLanguage"])}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="english">English</option>
              <option value="hindi">Hindi</option>
              <option value="marathi">Marathi</option>
            </select>
          </div>
          <Button variant="primary" size="lg" className="flex-1" onClick={handleSave} disabled={saving || uploadBusy}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
          <Button variant="ghost" size="lg" onClick={() => router.back()} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>

      {/* Previous Reports modal */}
      {reportsOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setReportsOpen(false)} />
          <div className="relative flex w-full max-w-2xl flex-col gap-3 overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-xl sm:max-h-[85vh] sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold text-ink">Previous Reports</p>
              <button onClick={() => setReportsOpen(false)} className="text-lg text-ink-muted hover:text-sos" aria-label="Close">✕</button>
            </div>
            {reportsLoading && <p className="text-sm text-ink-muted">Loading…</p>}
            {!reportsLoading && (!reportsData || reportsData.length === 0) && (
              <p className="text-sm text-ink-muted">No previous reports found.</p>
            )}
            {!reportsLoading && reportsData && reportsData.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {reportsData.map((r, i) => (
                  <div
                    key={r.publicId}
                    className="overflow-hidden rounded-xl border border-line bg-surface-raised"
                  >
                    <a
                      href={r.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block transition-opacity hover:opacity-80"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={r.signedUrl}
                        alt={`Report ${i + 1}`}
                        className="h-28 w-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                      <div className="px-2 pt-1.5">
                        <p className="text-[11px] text-ink-muted">
                          {new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                        <p className="text-[11px] font-semibold text-brand">Open ↗</p>
                      </div>
                    </a>
                    <div className="px-2 pb-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => deleteReport(r)}
                        disabled={deletingId === r.publicId}
                        className="w-full rounded-lg py-1 text-[11px] font-semibold text-sos hover:bg-sos/10 disabled:opacity-50"
                      >
                        {deletingId === r.publicId ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function FL({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 block text-xs font-medium uppercase tracking-wider text-ink-muted"
    >
      {children}
    </label>
  );
}

function AutoTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <FL>{label}</FL>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="resize-none overflow-hidden py-2"
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

function EditSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-sm text-ink-muted hover:underline">← Back</button>
      <div className="rounded-2xl border border-line bg-surface-raised p-4 space-y-3">
        <Skeleton className="h-4 w-36" />
        <div className="flex gap-3">
          <Skeleton className="h-12 flex-1 rounded-xl" />
          <Skeleton className="h-12 w-32 rounded-xl" />
          <Skeleton className="h-12 w-24 rounded-xl" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-12 w-36 rounded-xl" />
          <Skeleton className="h-12 w-36 rounded-xl" />
          <Skeleton className="h-12 flex-1 rounded-xl" />
          <Skeleton className="h-12 flex-1 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <Skeleton className="h-36 rounded-xl" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
      </div>
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
      <div className="flex gap-3">
        <Skeleton className="h-12 w-[40%] rounded-xl" />
        <Skeleton className="h-12 flex-1 rounded-xl" />
        <Skeleton className="h-12 w-24 rounded-xl" />
      </div>
    </div>
  );
}
