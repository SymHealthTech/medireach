"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { MedicineEditor, type MedicineRow } from "@/components/app/MedicineEditor";
import { KeywordText, type FieldKeyword } from "@/components/app/KeywordText";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { apiGet, apiPost } from "@/lib/client/api";
import { useMe } from "@/lib/client/useMe";
import { useOnlineStatus } from "@/lib/client/useOnlineStatus";
import { saveConsultDraft, loadConsultDraft, clearConsultDraft } from "@/lib/client/consultDraft";
import { enqueueVisitFinalize } from "@/lib/client/outbox";
import { useRecorder } from "@/lib/client/recorder";
import { uploadSigned } from "@/lib/client/upload";
import { sharePrescriptionPdf, normalizeWhatsappNumber } from "@/lib/client/share";
import { PrescriptionSheet, type PrescriptionSheetData } from "@/components/prescription/PrescriptionSheet";
import { PreparingOverlay } from "@/components/prescription/PreparingOverlay";
import { sheetToPdf, imageUrlToDataUrl } from "@/lib/client/prescriptionRaster";
import { isQuickServicePurpose, isCertificatePurpose, visitPurposeLabel } from "@/lib/constants";

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
  name: string; gender: string; ageYears: string;
  mobile: string; emergencyContact: string; address: string; allergicTo: string;
}
interface VisitHistoryRecord {
  _id: string;
  type: string;
  confirmedAt?: string;
  createdAt: string;
  co?: string;
  ho?: string;
  fh?: string;
  oe?: OE;
  diagnosis?: string;
  provisionalDiagnosis?: string;
  medicines?: Array<{ name: string; type?: string; clinicalText?: string; dosage?: string; frequency?: string }>;
  notes?: string;
  fees?: number;
  reportPublicIds?: string[];
}
interface ReportItem {
  publicId: string;
  signedUrl: string;
  date: string;
}

// Row 1: 6 fields — Row 2: 5 fields. Both groups fill full width in their own grid.
const OE_ROW1: { key: keyof OE; label: string }[] = [
  { key: "height", label: "Height" },
  { key: "weight", label: "Weight" },
  { key: "temp",   label: "Temp"   },
  { key: "bp",     label: "BP"     },
  { key: "pulse",  label: "Pulse"  },
  { key: "pa",     label: "P/A"    },
];
const OE_ROW2: { key: keyof OE; label: string }[] = [
  { key: "cvs", label: "CVS" },
  { key: "cns", label: "CNS" },
  { key: "rr",  label: "RR"  },
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

// O/E sub-fields that own their own keyword dictionary (spec §9.5).
const OE_KW_FIELD: Partial<Record<keyof OE, string>> = {
  pa:  "oe_pa",
  cvs: "oe_cvs",
  cns: "oe_cns",
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

// True when a form carries no doctor-entered content (prescriptionLanguage
// always has a default, so it's ignored). Used to reject a stray empty draft.
function isFormEmpty(f: FormState): boolean {
  const textFilled = [f.ho, f.fh, f.co, f.notes, f.provisionalDiagnosis, f.diagnosis, f.followUp, f.fees, f.adviceGeneral, f.adviceLabTest]
    .some((v) => (v ?? "").trim() !== "");
  const oeFilled = Object.values(f.oe ?? {}).some((v) => (v ?? "").trim() !== "");
  const medsFilled = (f.medicines ?? []).some((m) => m.name.trim() !== "");
  const reportsFilled = (f.reportPublicIds ?? []).length > 0;
  return !(textFilled || oeFilled || medsFilled || reportsFilled);
}

/** Feedback shown under the "Send on WhatsApp" button after a share attempt. */
function ShareHint({ hint }: { hint: "link" | "nolink" | null }) {
  if (!hint) return null;
  if (hint === "link")
    return (
      <p className="rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand" role="status">
        📄 Prescription link added to the WhatsApp message — the patient taps it to view or download the PDF.
      </p>
    );
  return (
    <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos" role="status">
      ⚠️ Couldn&apos;t add the prescription link — the message opened without it. Please tap Send again.
    </p>
  );
}

export default function ConsultPage() {
  const { visitId } = useParams<{ visitId: string }>();
  const router = useRouter();
  const { me } = useMe();
  const recorder = useRecorder();
  // Voice + AI dictation is Pro-only (Change 3). On Starter the whole dictate
  // affordance is absent — the doctor types every field (with keyword shortcuts
  // and local abbreviation expansion). The backend also blocks the paid routes.
  const isPro = me?.tier === "pro";

  const [form, setForm] = useState<FormState>(emptyForm);
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientEdits, setPatientEdits] = useState<PatientEdits>({
    name: "", gender: "", ageYears: "", mobile: "", emergencyContact: "", address: "", allergicTo: "",
  });
  const [clinic, setClinic] = useState<{
    clinicName: string; clinicAddress: string; clinicTimings: string; clinicMobile?: string;
    doctorName: string; degree: string; registrationNumber: string;
    defaultWhatsappTarget?: string;
    clinicWhatsapp?: string; receptionistWhatsapp?: string; storeWhatsapp?: string;
  } | null>(null);
  const [tpl, setTpl] = useState<{
    presetKey: string;
    designation?: string;
    footer?: { storeName?: string; storeAddress?: string; storeContact?: string };
  } | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [reportFiles, setReportFiles] = useState<{ name: string; publicId: string }[]>([]);
  const [status, setStatus] = useState<"draft" | "confirmed">("draft");
  const [visitMode, setVisitMode] = useState<string>("consultation");
  const [step, setStep] = useState<"form" | "review">("form");
  const [aiState, setAiState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [successModal, setSuccessModal] = useState<"saved" | "sent" | null>(null);
  // Result of the last WhatsApp share — drives the on-screen hint under the button.
  const [shareHint, setShareHint] = useState<"link" | "nolink" | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [oeExpanded, setOeExpanded] = useState(false);

  // Stage 0 offline handling: ambient connectivity + on-device draft mirror.
  // `hydratedRef` gates autosave until after the initial server load (and draft
  // overlay) so we never clobber a saved draft with the empty starting form.
  const online = useOnlineStatus();
  const [draftRestored, setDraftRestored] = useState(false);
  const hydratedRef = useRef(false);
  // Always-current form/patient/status, for the flush-on-unmount cleanup below
  // (which otherwise closes over stale values).
  const latestRef = useRef<{ form: FormState; patientEdits: PatientEdits }>({ form: emptyForm, patientEdits: { name: "", gender: "", ageYears: "", mobile: "", emergencyContact: "", address: "", allergicTo: "" } });
  const statusRef = useRef<"draft" | "confirmed">("draft");
  // Set when a save was parked in the offline outbox instead of reaching the
  // server — flips the success modal into "will sync when you reconnect" copy.
  const [queuedSync, setQueuedSync] = useState(false);

  // Patient Dues (clinic fee bookkeeping — separate from subscription billing).
  // `duesTotal` = the patient's outstanding dues from PREVIOUS visits (shown as
  // an indicator by the fees field). `amountPaid` drives the post-prescription
  // capture; `capturedRef` guards against recording the payment twice.
  const [duesTotal, setDuesTotal] = useState<number | null>(null);
  const [amountPaid, setAmountPaid] = useState("");
  const capturedRef = useRef(false);
  const [patientInfoOpen, setPatientInfoOpen] = useState(false);
  const [kwByField, setKwByField] = useState<Record<string, FieldKeyword[]>>({});

  // Patient history modal
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState<VisitHistoryRecord[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Previous reports modal
  const [reportsOpen, setReportsOpen] = useState(false);
  const [reportsData, setReportsData] = useState<ReportItem[] | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);

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
        const serverEdits: PatientEdits = {
          name: (p.name as string) ?? "",
          gender: (p.gender as string) ?? "",
          ageYears: p.ageYears != null ? String(p.ageYears) : "",
          mobile: (p.mobile as string) ?? "",
          emergencyContact: (p.emergencyContact as string) ?? "",
          address: (p.address as string) ?? "",
          allergicTo: (p.allergicTo as string) ?? "",
        };
        const serverForm: FormState = {
          ho: (visit.ho as string) ?? "",
          fh: (visit.fh as string) ?? "",
          co: (visit.co as string) ?? "",
          oe: {
            height: visitOe.height || "",
            weight: visitOe.weight || "",
            temp:   visitOe.temp   || "",
            bp:     visitOe.bp     || "",
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
        };
        // Overlay any on-device draft (unsaved work from a previous session)
        // ATOMICALLY with the server load — done here, in the same callback that
        // sets the server data, so no separate effect can race and blank it out.
        const draft = loadConsultDraft<FormState, PatientEdits>(visitId);
        if (draft && draft.form && !isFormEmpty(draft.form)) {
          setForm(draft.form);
          setPatientEdits(draft.patientEdits ?? serverEdits);
          setDraftRestored(true);
        } else {
          setForm(serverForm);
          setPatientEdits(serverEdits);
        }
        hydratedRef.current = true;
        setStatus((visit.status as "draft" | "confirmed") ?? "draft");
        setVisitMode((visit.visitMode as string) ?? "consultation");
        const existingIds = (visit.reportPublicIds as string[]) ?? [];
        setReportFiles(existingIds.map((id, i) => ({ name: `Report ${i + 1}`, publicId: id })));
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
    apiGet<{
      template: { presetKey: string; designation?: string; footer?: { storeName?: string; storeAddress?: string; storeContact?: string }; signatureUrl?: string };
      clinic: NonNullable<typeof clinic>;
    }>("/api/template")
      .then(async (d) => {
        setTpl({ presetKey: d.template.presetKey, designation: d.template.designation, footer: d.template.footer });
        setClinic(d.clinic);
        if (d.template.signatureUrl) setSignatureDataUrl(await imageUrlToDataUrl(d.template.signatureUrl));
      })
      .catch(() => {});
    apiGet<{ keywords: Array<{ field?: string; keyword: string; expansion: string }> }>("/api/keywords")
      .then((d) => {
        const grouped: Record<string, FieldKeyword[]> = {};
        for (const k of d.keywords) {
          const field = k.field ?? "medicine";
          if (field === "medicine") continue; // medicine shortcuts are handled by MedicineEditor
          (grouped[field] ??= []).push({ keyword: k.keyword, expansion: k.expansion });
        }
        setKwByField(grouped);
      })
      .catch(() => {});
  }, [visitId]);

  // Keep the latest values reachable from the unmount cleanup (which otherwise
  // closes over stale state).
  latestRef.current = { form, patientEdits };
  statusRef.current = status;

  // Mirror edits to the device (debounced). Rule is deliberately simple: while
  // the visit is still an unsaved draft, persist whatever the doctor has typed;
  // if the form is empty, clear instead so we never store a blank draft. Once
  // the visit is confirmed the server holds it, so autosave stops (and the
  // status-change re-run cancels any pending timer, avoiding a post-save write).
  useEffect(() => {
    if (!hydratedRef.current || status !== "draft") return;
    const t = setTimeout(() => {
      if (isFormEmpty(form)) clearConsultDraft(visitId);
      else saveConsultDraft(visitId, form, patientEdits);
    }, 500);
    return () => clearTimeout(t);
  }, [form, patientEdits, visitId, status]);

  // Flush the latest edits synchronously on navigation away, so keystrokes still
  // inside the debounce window when the doctor leaves are never lost.
  useEffect(() => {
    return () => {
      if (!hydratedRef.current || statusRef.current !== "draft") return;
      const { form: f, patientEdits: pe } = latestRef.current;
      if (!isFormEmpty(f)) saveConsultDraft(visitId, f, pe);
    };
  }, [visitId]);

  const kw = useCallback((field: string): FieldKeyword[] => kwByField[field] ?? [], [kwByField]);

  // Load the patient's outstanding dues from previous visits (excluding this one)
  // so the fees field can show a "Dues: ₹___" indicator for returning patients.
  useEffect(() => {
    if (!patientId) return;
    apiGet<{ items: { visitId: string; dueAmount: number }[] }>(`/api/dues/${patientId}`)
      .then((d) => {
        const prev = d.items
          .filter((it) => it.visitId !== visitId)
          .reduce((sum, it) => sum + it.dueAmount, 0);
        setDuesTotal(prev);
      })
      .catch(() => {});
  }, [patientId, visitId]);

  // Persist the in-progress draft, then open this patient's dues detail — so the
  // doctor can return (via its Back button) to the consult without losing work.
  async function goToDues() {
    if (!patientId) return;
    try {
      await fetch(`/api/visits/${visitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
    } catch { /* best-effort — navigate regardless */ }
    router.push(`/app/dues/${patientId}?from=${encodeURIComponent(`/app/consult/${visitId}`)}`);
  }

  // Record the payment collected at the post-prescription moment. The fee comes
  // from the visit server-side; here we send only what was collected. Best-effort
  // and guarded so it fires once — it must never trap the doctor at the modal.
  async function captureDues(paidStr: string) {
    if (capturedRef.current) return;
    const fee = Number(form.fees) || 0;
    if (fee <= 0) return;
    capturedRef.current = true;
    const paid = Math.max(0, Math.min(Number(paidStr) || 0, fee));
    try {
      await apiPost("/api/dues", { visitId, amountPaid: paid });
    } catch { /* swallow — the doctor can still settle later on the Dues page */ }
  }

  async function finishToQueue(paidStr: string) {
    await captureDues(paidStr);
    router.push("/app/queue");
  }

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function setOE(key: keyof OE, v: string) {
    setForm((f) => ({ ...f, oe: { ...f.oe, [key]: v } }));
  }

  function renderOeField({ key, label }: { key: keyof OE; label: string }) {
    const kwField = OE_KW_FIELD[key];
    return (
      <div key={key}>
        <FL htmlFor={`oe-${key}`}>{label}</FL>
        {kwField ? (
          <KeywordText
            id={`oe-${key}`}
            value={form.oe[key] ?? ""}
            onChange={(v) => setOE(key, v)}
            keywords={kw(kwField)}
            className="h-10"
          />
        ) : (
          <div className="relative">
            <Input
              id={`oe-${key}`}
              value={form.oe[key] ?? ""}
              onChange={(e) => setOE(key, e.target.value)}
              className={`h-10${OE_UNITS[key] && form.oe[key] ? " pr-12" : ""}`}
            />
            {OE_UNITS[key] && form.oe[key] && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-muted">
                {OE_UNITS[key]}
              </span>
            )}
          </div>
        )}
      </div>
    );
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

  // The exact A4 sheet that prints / ships — rendered hidden and rasterised on
  // share. Uses the structured medicine + vitals fields (no AI, both tiers).
  const sheetData: PrescriptionSheetData = useMemo(
    () => ({
      templateId: tpl?.presetKey ?? "teal-classic",
      doctor: {
        name: clinic?.doctorName ?? "",
        degree: clinic?.degree,
        registrationNumber: clinic?.registrationNumber,
        clinicName: clinic?.clinicName ?? "",
        clinicAddress: clinic?.clinicAddress,
        clinicMobile: clinic?.clinicMobile,
        clinicTimings: clinic?.clinicTimings,
        designation: tpl?.designation,
      },
      patient: { name: patient?.name ?? "Patient", ageYears: patient?.ageYears, gender: patient?.gender },
      date: new Date().toLocaleDateString("en-IN"),
      oe: { bp: form.oe.bp, temp: form.oe.temp, weight: form.oe.weight, bsl: form.oe.bsl },
      medicines: form.medicines
        .filter((m) => m.name.trim())
        .map((m) => ({ type: m.type, name: m.name, generic: m.generic, dose: m.dose, frequency: m.frequency, timing: m.timing })),
      signatureDataUrl,
      sponsor: tpl?.footer ?? null,
    }),
    [tpl, clinic, patient, form, signatureDataUrl],
  );

  if (loading) return <ConsultSkeleton />;

  // Targeted connectivity notices, rendered next to the save/send actions so the
  // doctor knows exactly why a save can't complete (the app-wide banner covers
  // the ambient state; this explains it right where they're about to act).
  const connectivityNotices = (
    <>
      {!online && (
        <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300" role="status">
          📴 You&rsquo;re offline. Keep working — everything is kept on this device. Saving to records and sending the prescription will resume automatically once you reconnect.
        </p>
      )}
      {draftRestored && online && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand" role="status">
          <span>↩️ Restored your unsaved work from this device.</span>
          <button
            type="button"
            onClick={() => setDraftRestored(false)}
            aria-label="Dismiss"
            className="shrink-0 rounded-md px-2 py-0.5 font-semibold text-brand hover:bg-brand/10"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );

  async function openHistory() {
    setHistoryOpen(true);
    if (historyData !== null || !patientId) return;
    setHistoryLoading(true);
    try {
      const { visits } = await apiGet<{ visits: VisitHistoryRecord[] }>(`/api/patients/${patientId}/history`);
      setHistoryData(visits.filter((v) => v._id !== visitId));
    } catch {
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function openReports() {
    setReportsOpen(true);
    if (reportsData !== null || !patientId) return;
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

  // The demographics payload sent to PATCH /api/patients/[id]. Shared by the
  // live save and the offline outbox job so a queued replay is byte-identical.
  function buildPatientPayload() {
    return {
      name: patientEdits.name || undefined,
      gender: (patientEdits.gender as "male" | "female" | "other") || undefined,
      ageYears: patientEdits.ageYears ? Number(patientEdits.ageYears) : undefined,
      mobile: patientEdits.mobile || undefined,
      emergencyContact: patientEdits.emergencyContact || undefined,
      address: patientEdits.address || undefined,
      allergicTo: patientEdits.allergicTo || undefined,
    };
  }

  async function savePatient() {
    if (!patientId) return;
    await fetch(`/api/patients/${patientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPatientPayload()),
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
    setUploadBusy(true);
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
      setUploadBusy(false);
    }
  }

  function removeReport(index: number) {
    const updated = reportFiles.filter((_, i) => i !== index);
    setReportFiles(updated);
    setField("reportPublicIds", updated.map((r) => r.publicId));
  }

  // A save that fails because the device is offline (either the browser reports
  // offline, or fetch itself rejects with a TypeError) is recoverable — we queue
  // it rather than surface an error. A rejected *response* is a real error.
  function isOfflineFailure(err: unknown): boolean {
    if (typeof navigator !== "undefined" && !navigator.onLine) return true;
    return err instanceof TypeError;
  }

  // Park this finalize in the offline outbox; OutboxSync replays it (patient
  // PATCH + visit confirm, both idempotent) the moment we're back online.
  function queueFinalize() {
    enqueueVisitFinalize({
      visitId,
      patientId,
      visitPayload: buildPayload(),
      patientPayload: patientId ? buildPatientPayload() : null,
    });
  }

  async function save() {
    setSaveBusy(true);
    setError(null);
    try {
      await Promise.all([
        apiPost(`/api/visits/${visitId}/confirm`, buildPayload()),
        savePatient(),
      ]);
      setStatus("confirmed");
      clearConsultDraft(visitId); // safely on the server now — drop the local mirror
      setQueuedSync(false);
      setSuccessModal("saved");
    } catch (err) {
      if (isOfflineFailure(err)) {
        queueFinalize();
        setQueuedSync(true);
        setSuccessModal("saved");
      } else {
        setError((err as Error).message);
      }
    } finally {
      setSaveBusy(false);
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
    setSendBusy(true);
    setError(null);
    try {
      await Promise.all([
        apiPost(`/api/visits/${visitId}/confirm`, buildPayload()),
        savePatient(),
      ]);
      setStatus("confirmed");
      // Prime the dues capture: pre-fill "Amount paid" with the full fee (the
      // 90% paid-in-full case is one tap) and reset the once-only capture guard.
      setAmountPaid(form.fees ?? "");
      capturedRef.current = false;
      clearConsultDraft(visitId); // safely on the server now — drop the local mirror
      setQueuedSync(false);
      setSuccessModal("sent");
    } catch (err) {
      if (isOfflineFailure(err)) {
        // The record is queued; the WhatsApp share + dues capture need a live
        // connection, so the queued modal offers only "Back to Queue".
        queueFinalize();
        setAmountPaid(form.fees ?? "");
        capturedRef.current = false;
        setQueuedSync(true);
        setSuccessModal("sent");
      } else {
        setError((err as Error).message);
      }
    } finally {
      setSendBusy(false);
    }
  }

  async function shareWhatsApp() {
    // The in-app <PreparingOverlay> (shown while shareBusy is set) covers the
    // raster + upload; WhatsApp opens from sharePrescriptionPdf once it's ready.
    const c = clinic ?? {
      clinicName: "", clinicAddress: "", clinicTimings: "",
      doctorName: "", degree: "", registrationNumber: "",
    };
    const sender = { name: c.doctorName, clinicName: c.clinicName };

    // Resolve the recipient number from the stored delivery-default target, so
    // the chat opens directly on the patient (or clinic/receptionist/store) number.
    const waTarget = c.defaultWhatsappTarget ?? "patient";
    const recipientRaw =
      waTarget === "clinic"       ? c.clinicWhatsapp :
      waTarget === "receptionist" ? c.receptionistWhatsapp :
      waTarget === "store"        ? c.storeWhatsapp :
      /* patient */                 patient?.mobile ?? "";
    const recipientDigits = normalizeWhatsappNumber(recipientRaw);
    const safeName = (patient?.name ?? "patient").trim().replace(/[^\w]+/g, "-").toLowerCase() || "patient";

    setShareBusy(true);
    setShareHint(null);
    try {
      if (!sheetRef.current) throw new Error("Sheet not ready.");
      const pdf = await sheetToPdf(sheetRef.current);
      const { linkIncluded } = await sharePrescriptionPdf({
        pdf, visitId, sender, recipientDigits, filename: `prescription-${safeName}.pdf`,
      });
      setShareHint(linkIncluded ? "link" : "nolink");
    } catch {
      // Rasterise/upload failed — let the doctor retry.
      setShareHint("nolink");
    } finally {
      setShareBusy(false);
    }
  }

  const modals = (
    <>
      <PatientInfoModal
        open={patientInfoOpen}
        onClose={() => setPatientInfoOpen(false)}
        patientEdits={patientEdits}
        patientId={patientId ?? ""}
        onSaved={(edits) => setPatientEdits((prev) => ({ ...prev, ...edits }))}
      />
      <PatientHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        loading={historyLoading}
        records={historyData}
      />
      <PatientReportsModal
        open={reportsOpen}
        onClose={() => setReportsOpen(false)}
        loading={reportsLoading}
        reports={reportsData}
      />
      {/* Full-screen in-app loader while the PDF builds + uploads and WhatsApp opens. */}
      <PreparingOverlay open={shareBusy} />
      {/* Off-screen A4 sheet — rasterised to a PNG for the WhatsApp share. */}
      <div aria-hidden style={{ position: "fixed", left: 0, top: 0, opacity: 0, pointerEvents: "none", zIndex: -1 }}>
        <PrescriptionSheet ref={sheetRef} data={sheetData} />
      </div>
    </>
  );

  // ── Review step ───────────────────────────────────────────────────────────
  if (step === "review") {
    const activeMeds = form.medicines.filter((m) => m.name.trim());
    const oeEntries = OE_FIELDS.filter(({ key }) => form.oe[key]);
    // Post-prescription dues capture figures (clamped like the server does).
    const feeNum = Number(form.fees) || 0;
    const paidNum = Math.max(0, Math.min(Number(amountPaid) || 0, feeNum));
    const dueNum = feeNum - paidNum;

    return (
      <>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="border-l-4 border-brand pl-3">
              <h1 className="text-2xl font-bold tracking-tight text-ink">{patient?.name ?? "Consultation"}</h1>
              {patient && (
                <p className="mt-1 text-sm text-ink-muted">
                  {patient.gender}{patient.ageYears ? ` · ${patient.ageYears}y` : ""}
                </p>
              )}
              {patientId && (
                <button onClick={openHistory} className="mt-0.5 text-sm font-semibold text-brand hover:underline">
                  Records
                </button>
              )}
            </div>
            <button onClick={() => setStep("form")} className="text-sm text-ink-muted hover:underline">
              ← Edit
            </button>
          </div>

          <PatientInfoCard patientEdits={patientEdits} />

          {connectivityNotices}
          {error && <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos" role="alert">{error}</p>}

          <Card className="space-y-4">
            <p className="font-semibold text-ink">Review Prescription</p>

            {form.co && <ReviewRow label="C/O" value={form.co} />}
            {form.ho && <ReviewRow label="P/H/O" value={form.ho} />}
            {form.fh && <ReviewRow label="F/H" value={form.fh} />}

            {oeEntries.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-ink-muted">O/E</p>
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
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-ink-muted">Medicines</p>
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

          <div className="flex gap-3 rounded-2xl border border-line bg-surface-raised p-3 shadow-lg">
            <Button variant="outline" size="lg" className="min-w-[30%]" onClick={save} disabled={saveBusy || sendBusy}>
              {saveBusy ? "Saving…" : "Save"}
            </Button>
            <Button variant="primary" size="lg" className="flex-1" onClick={sendPrescription} disabled={saveBusy || sendBusy}>
              {sendBusy ? "Sending…" : "Send Prescription"}
            </Button>
          </div>
        </div>
        {modals}

        {successModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl text-center space-y-4">
              <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${queuedSync ? "bg-amber-500/15" : "bg-success/15"}`}>
                {queuedSync ? (
                  <span className="text-3xl" aria-hidden>📴</span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-8 w-8 text-success">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-ink">
                  {queuedSync
                    ? "Saved on this device"
                    : successModal === "saved" ? "Visit Saved" : "Visit Confirmed"}
                </p>
                <p className="mt-1 text-sm text-ink-muted">
                  {queuedSync
                    ? "You're offline, so this isn't in records yet — it'll sync automatically the moment you're back online. WhatsApp and payment can be done once it's synced."
                    : successModal === "saved"
                      ? "The consultation has been saved and confirmed."
                      : "The prescription has been confirmed and saved."}
                </p>
              </div>

              {/* Post-prescription payment capture (Patient Dues). Shows only when
                  a fee was charged. Amount paid is pre-filled with the full fee —
                  the paid-in-full case is a single tap. */}
              {successModal === "sent" && !queuedSync && feeNum > 0 && (
                <div className="rounded-xl border border-line bg-surface-raised p-3 text-left">
                  <div className="flex items-center justify-between">
                    <label htmlFor="amount-paid" className="text-xs font-medium uppercase tracking-wider text-ink-muted">
                      Amount paid (₹)
                    </label>
                    <span className="text-xs text-ink-muted">Fee ₹{feeNum}</span>
                  </div>
                  <Input
                    id="amount-paid"
                    inputMode="numeric"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value.replace(/[^\d]/g, ""))}
                    className="mt-1"
                  />
                  <p className="mt-1.5 text-xs text-ink-muted">
                    {dueNum > 0 ? (
                      <>₹{dueNum} will be recorded as a <span className="font-semibold text-sos">due</span>.</>
                    ) : (
                      <span className="font-semibold text-success">Paid in full.</span>
                    )}
                  </p>
                </div>
              )}

              {successModal === "sent" && !queuedSync && (
                <>
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={shareWhatsApp}
                    disabled={shareBusy}
                  >
                    {shareBusy ? "Preparing…" : "Send on WhatsApp"}
                  </Button>
                  <ShareHint hint={shareHint} />
                </>
              )}

              {successModal === "sent" && !queuedSync && feeNum > 0 ? (
                <>
                  <Button
                    variant="brand"
                    size="lg"
                    className="w-full"
                    onClick={() => finishToQueue(amountPaid)}
                  >
                    {dueNum > 0 ? `Record ₹${paidNum} & Back to Queue` : "Confirm Payment & Back to Queue"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => finishToQueue("0")}
                    className="w-full text-sm font-semibold text-ink-muted hover:underline"
                  >
                    Skip — leave ₹{feeNum} as a due
                  </button>
                </>
              ) : (
                <Button
                  variant={successModal === "sent" && !queuedSync ? "outline" : "brand"}
                  size="lg"
                  className="w-full"
                  onClick={() => router.push("/app/queue")}
                >
                  Back to Queue
                </Button>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  // ── Form step ─────────────────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-4">
        {/* Header + Dictate — 50/50 on desktop */}
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          {/* Left: patient name + queue + records */}
          <Card className="flex flex-col justify-center gap-2 p-4 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight text-ink">{patientEdits.name || (patient?.name ?? "Consultation")}</h1>
                {isQuickServicePurpose(visitMode) && (
                  <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                    {isCertificatePurpose(visitMode) ? "📄 " : ""}{visitPurposeLabel(visitMode)}
                  </span>
                )}
              </div>
              {patient && (
                <p className="text-sm text-ink-muted">
                  {patientEdits.gender || patient.gender}
                  {(patientEdits.ageYears || patient.ageYears) ? ` · ${patientEdits.ageYears || patient.ageYears}y` : ""}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {patientId && (
                <>
                  <button
                    onClick={() => setPatientInfoOpen(true)}
                    className="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-line/30"
                  >
                    Patient Info
                  </button>
                  <button
                    onClick={openHistory}
                    className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-fg hover:opacity-90"
                  >
                    Records
                  </button>
                </>
              )}
              <button onClick={() => router.push("/app/queue")} className="ml-auto text-sm text-ink-muted hover:underline lg:hidden">
                ← Queue
              </button>
            </div>
          </Card>

          {/* Right: dictate card — Pro only. Absent (not disabled) on Starter. */}
          {status === "draft" && isPro ? (
            <Card className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold text-ink">Dictate the consultation</p>
                <p className="text-sm text-ink-muted">
                  {recorder.recording ? "Recording… tap stop when done." : aiState ?? "Speak naturally; AI fills the fields."}
                </p>
              </div>
              <Button
                variant="brand"
                size="lg"
                onClick={handleDictation}
                disabled={!!aiState || !recorder.supported}
                className={`lg:h-full ${recorder.recording ? "animate-pulse ring-2 ring-brand/40" : ""}`}
              >
                {recorder.recording ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-white" /> Stop
                  </span>
                ) : aiState ? (
                  <span className="flex items-center gap-2"><Spinner size="sm" className="border-white/40 border-t-white" /> Working…</span>
                ) : (
                  "🎤 Dictate"
                )}
              </Button>
            </Card>
          ) : <div />}
        </div>

        {isPro && !recorder.supported && (
          <p className="text-sm text-ink-muted">Voice capture isn&apos;t supported on this browser — type the fields below.</p>
        )}

        {connectivityNotices}
        {error && <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos" role="alert">{error}</p>}

        {/* Confirmed success banner */}
        {status === "confirmed" && (
          <Card className="space-y-4 border-success/40 bg-success/5">
            <p className="font-semibold text-success">✓ Visit confirmed and saved.</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" size="lg" onClick={shareWhatsApp} disabled={shareBusy}>
                {shareBusy ? "Preparing…" : "Send on WhatsApp"}
              </Button>
              <Button variant="ghost"   size="lg" onClick={() => router.push("/app/queue")}>Done</Button>
            </div>
            <ShareHint hint={shareHint} />
          </Card>
        )}

        {/* P/H/O · F/H · Allergic To · C/O — other 3 share 50%, C/O takes 50% on desktop */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_1fr_3fr]">
          <TextareaField label="P/H/O — Past history"               value={form.ho} onChange={(v) => setField("ho", v)} keywords={kw("ho")} />
          <TextareaField label="F/H — Family history"               value={form.fh} onChange={(v) => setField("fh", v)} keywords={kw("fh")} />
          <div>
            <label
              htmlFor="allergic-to"
              className={`mb-1 block text-xs font-medium uppercase tracking-wider ${patientEdits.allergicTo ? "text-action" : "text-ink-muted"}`}
            >
              {patientEdits.allergicTo ? "⚠ Allergic To" : "Allergic To"}
            </label>
            <KeywordText
              multiline
              autoGrow
              rows={1}
              id="allergic-to"
              value={patientEdits.allergicTo}
              onChange={(v) => setPatientEdits((prev) => ({ ...prev, allergicTo: v }))}
              keywords={kw("allergic")}
              className={`py-2 resize-none overflow-hidden${patientEdits.allergicTo ? " border-action/50 bg-action/5 focus-visible:ring-action" : ""}`}
            />
          </div>
          <TextareaField label="C/O — Complaints of present illness" value={form.co} onChange={(v) => setField("co", v)} keywords={kw("co")} />
        </div>

        {/* O/E — On examination */}
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-ink">O/E — On examination</p>
          {/* First 6 fields (full ROW1) — always visible */}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {OE_ROW1.map((f) => renderOeField(f))}
          </div>
          {/* Remaining fields (ROW2) — shown when expanded */}
          {oeExpanded && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {OE_ROW2.map((f) => renderOeField(f))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setOeExpanded((v) => !v)}
            className="text-xs font-semibold text-brand hover:underline"
          >
            {oeExpanded ? "Show less ▲" : "Show more ▼"}
          </button>
        </Card>

        {/* Notes (left) · Scan & save reports (right) — 50/50 same height */}
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          <div className="flex flex-col">
            <FL>Notes</FL>
            <KeywordText
              multiline
              autoGrow
              rows={1}
              value={form.notes}
              onChange={(v) => setField("notes", v)}
              keywords={kw("co")}
              className="py-2 resize-none overflow-hidden"
            />
          </div>
          <div className="flex flex-col">
            <FL>Scan &amp; save reports</FL>
            <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface-raised px-3 py-2">
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
                {patientId && (
                  <button
                    type="button"
                    onClick={openReports}
                    className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-line/30"
                  >
                    Show Reports
                  </button>
                )}
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
            <KeywordText id="prov-dx" value={form.provisionalDiagnosis}
              onChange={(v) => setField("provisionalDiagnosis", v)} keywords={kw("diagnosis")} />
          </div>
          <div>
            <FL htmlFor="dx">Diagnosis</FL>
            <KeywordText id="dx" value={form.diagnosis}
              onChange={(v) => setField("diagnosis", v)} keywords={kw("diagnosis")} />
          </div>
          <div>
            <FL htmlFor="follow-up">Follow Up</FL>
            <Input id="follow-up" value={form.followUp} placeholder="e.g. 3 days"
              onChange={(e) => setField("followUp", e.target.value)} />
          </div>
          <div>
            <FL htmlFor="fees">Fees (₹)</FL>
            <KeywordText id="fees" inputMode="numeric" value={form.fees}
              onChange={(v) => setField("fees", v)} keywords={kw("fees")} />
            {/* Patient Dues indicator — outstanding from previous visits. Tapping
                opens the dues detail; the consult draft is saved so no work is lost. */}
            {duesTotal != null && duesTotal > 0 && (
              <button
                type="button"
                onClick={goToDues}
                className="mt-1 inline-flex items-center gap-1 rounded-lg bg-sos/10 px-2 py-1 text-xs font-semibold text-sos hover:bg-sos/15"
              >
                Dues: ₹{duesTotal} ›
              </button>
            )}
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
            <TextareaField label="General Advice" value={form.adviceGeneral} onChange={(v) => setField("adviceGeneral", v)} keywords={kw("advice")} />
            <TextareaField label="Lab Test" value={form.adviceLabTest} onChange={(v) => setField("adviceLabTest", v)} keywords={kw("labTest")} />
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
                className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="english">English</option>
                <option value="hindi">Hindi</option>
                <option value="marathi">Marathi</option>
              </select>
            </div>
            <Button variant="primary" size="lg" className="flex-1 lg:max-w-[60%]" onClick={() => setStep("review")} disabled={uploadBusy}>
              Next
            </Button>
          </div>
        )}
      </div>
      {modals}
    </>
  );
}

// ── Patient history modal ─────────────────────────────────────────────────────
function PatientHistoryModal({
  open,
  onClose,
  loading,
  records,
}: {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  records: VisitHistoryRecord[] | null;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex w-full max-w-2xl flex-col gap-3 overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-xl sm:max-h-[85vh] sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-ink">Patient Records</p>
          <button onClick={onClose} className="text-lg text-ink-muted hover:text-sos" aria-label="Close">✕</button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <Spinner size="sm" /> Loading…
          </div>
        )}
        {!loading && records?.length === 0 && (
          <p className="text-sm text-ink-muted">No previous records found.</p>
        )}
        {!loading && records && records.length > 0 && (
          <div className="space-y-2">
            {records.map((v) => {
              const isOpen = expandedIds.has(v._id);
              const dateStr = new Date(v.confirmedAt ?? v.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit", month: "short", year: "numeric",
              });
              const activeMeds = (v.medicines ?? []).filter((m) => m.name);
              const oeKeys = v.oe ? (Object.keys(v.oe) as Array<keyof OE>).filter((k) => v.oe![k]) : [];

              return (
                <div key={v._id} className="overflow-hidden rounded-xl border border-line">
                  <button
                    className="flex w-full items-center justify-between bg-surface-raised px-3 py-2.5 text-left"
                    onClick={() => toggle(v._id)}
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-sm font-semibold text-ink">{dateStr}</span>
                      <span className="rounded-md bg-line/60 px-1.5 py-0.5 text-[11px] font-medium capitalize text-ink-muted">
                        {v.type}
                      </span>
                      {v.diagnosis && (
                        <span className="text-[11px] text-ink-muted">· {v.diagnosis}</span>
                      )}
                    </div>
                    <span className="ml-2 shrink-0 text-[11px] text-ink-muted">{isOpen ? "▲" : "▼"}</span>
                  </button>

                  {isOpen && (
                    <div className="space-y-2.5 px-3 py-3 text-sm">
                      {v.co && <HistoryRow label="C/O" value={v.co} />}
                      {v.ho && <HistoryRow label="P/H/O" value={v.ho} />}
                      {v.fh && <HistoryRow label="F/H" value={v.fh} />}

                      {oeKeys.length > 0 && (
                        <div>
                          <p className="mb-0.5 text-xs font-medium uppercase tracking-wider text-ink-muted">O/E</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                            {OE_FIELDS.filter(({ key }) => oeKeys.includes(key)).map(({ key, label }) => (
                              <span key={key} className="text-ink">
                                <span className="font-medium">{label}:</span> {fmtOE(key, v.oe![key])}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {v.provisionalDiagnosis && <HistoryRow label="Provisional Dx" value={v.provisionalDiagnosis} />}
                      {v.diagnosis && <HistoryRow label="Diagnosis" value={v.diagnosis} />}

                      {activeMeds.length > 0 && (
                        <div>
                          <p className="mb-0.5 text-xs font-medium uppercase tracking-wider text-ink-muted">Medicines</p>
                          <ol className="list-decimal space-y-0.5 pl-4">
                            {activeMeds.map((m, i) => (
                              <li key={i} className="text-ink">
                                {m.clinicalText ||
                                  `${m.type ? m.type + ". " : ""}${m.name}${m.dosage ? " " + m.dosage : ""}${m.frequency ? " — " + m.frequency : ""}`}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {v.notes && <HistoryRow label="Notes" value={v.notes} />}
                      {v.fees != null && <HistoryRow label="Fees" value={`₹${v.fees}`} />}
                      {(v.reportPublicIds?.length ?? 0) > 0 && (
                        <p className="text-[11px] text-ink-muted">{v.reportPublicIds!.length} report(s) on file</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Patient reports modal ─────────────────────────────────────────────────────
function PatientReportsModal({
  open,
  onClose,
  loading,
  reports,
}: {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  reports: ReportItem[] | null;
}) {
  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex w-full max-w-2xl flex-col gap-3 overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-xl sm:max-h-[85vh] sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-ink">Previous Reports</p>
          <button onClick={onClose} className="text-lg text-ink-muted hover:text-sos" aria-label="Close">✕</button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <Spinner size="sm" /> Loading…
          </div>
        )}
        {!loading && (!reports || reports.length === 0) && (
          <p className="text-sm text-ink-muted">No previous reports found.</p>
        )}
        {!loading && reports && reports.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {reports.map((r, i) => (
              <a
                key={r.publicId}
                href={r.signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group block overflow-hidden rounded-xl border border-line bg-surface-raised transition-opacity hover:opacity-80"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.signedUrl}
                  alt={`Report ${i + 1}`}
                  className="h-28 w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="px-2 py-1.5">
                  <p className="text-[11px] text-ink-muted">
                    {new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                  <p className="text-[11px] font-semibold text-brand">Open ↗</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Patient info card — review step only (read-only summary) ──────────────────
function PatientInfoCard({ patientEdits }: { patientEdits: PatientEdits }) {
  const items = [
    { label: "Mobile",            value: patientEdits.mobile,            warn: false },
    { label: "Emergency Contact", value: patientEdits.emergencyContact,  warn: false },
    { label: "Address",           value: patientEdits.address,           warn: false },
    { label: "Allergic To",       value: patientEdits.allergicTo,        warn: true  },
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

// ── Patient info modal ────────────────────────────────────────────────────────
function PatientInfoModal({
  open,
  onClose,
  patientEdits,
  patientId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  patientEdits: PatientEdits;
  patientId: string;
  onSaved: (edits: Omit<PatientEdits, "allergicTo">) => void;
}) {
  const [local, setLocal] = useState<Omit<PatientEdits, "allergicTo">>({
    name: "", gender: "", ageYears: "", mobile: "", emergencyContact: "", address: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLocal({
        name: patientEdits.name,
        gender: patientEdits.gender,
        ageYears: patientEdits.ageYears,
        mobile: patientEdits.mobile,
        emergencyContact: patientEdits.emergencyContact,
        address: patientEdits.address,
      });
    }
  }, [open, patientEdits]);

  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/patients/${patientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: local.name || undefined,
          gender: (local.gender as "male" | "female" | "other") || undefined,
          ageYears: local.ageYears ? Number(local.ageYears) : undefined,
          mobile: local.mobile || undefined,
          emergencyContact: local.emergencyContact || undefined,
          address: local.address || undefined,
        }),
      });
      onSaved(local);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-t-2xl bg-surface p-4 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-ink">Patient Information</p>
          <button onClick={onClose} className="text-lg text-ink-muted hover:text-sos" aria-label="Close">✕</button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FL htmlFor="pi-name">Full Name</FL>
              <Input
                id="pi-name"
                value={local.name}
                onChange={(e) => setLocal((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <FL htmlFor="pi-gender">Gender</FL>
              <select
                id="pi-gender"
                value={local.gender}
                onChange={(e) => setLocal((p) => ({ ...p, gender: e.target.value }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="">– select –</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <FL htmlFor="pi-age">Age (years)</FL>
              <Input
                id="pi-age"
                inputMode="numeric"
                value={local.ageYears}
                onChange={(e) => setLocal((p) => ({ ...p, ageYears: e.target.value.replace(/\D/g, "") }))}
              />
            </div>
            <div>
              <FL htmlFor="pi-mobile">Mobile</FL>
              <Input
                id="pi-mobile"
                inputMode="numeric"
                value={local.mobile}
                onChange={(e) => setLocal((p) => ({ ...p, mobile: e.target.value.replace(/\D/g, "") }))}
              />
            </div>
            <div>
              <FL htmlFor="pi-emergency">Emergency Contact</FL>
              <Input
                id="pi-emergency"
                inputMode="numeric"
                value={local.emergencyContact}
                onChange={(e) => setLocal((p) => ({ ...p, emergencyContact: e.target.value.replace(/\D/g, "") }))}
              />
            </div>
            <div>
              <FL htmlFor="pi-address">Address</FL>
              <Input
                id="pi-address"
                value={local.address}
                onChange={(e) => setLocal((p) => ({ ...p, address: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Muted, small field label — visually distinct from input text. */
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

/** Textarea field with a muted label — starts at 1 row, auto-expands. When
 *  `keywords` are supplied the field also expands the doctor's shortcuts. */
function TextareaField({
  label,
  value,
  onChange,
  keywords = [],
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keywords?: FieldKeyword[];
}) {
  return (
    <div>
      <FL>{label}</FL>
      <KeywordText
        multiline
        autoGrow
        rows={1}
        value={value}
        onChange={onChange}
        keywords={keywords}
        className="py-2 resize-none overflow-hidden"
      />
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="text-sm text-ink whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function HistoryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">{label}</p>
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
