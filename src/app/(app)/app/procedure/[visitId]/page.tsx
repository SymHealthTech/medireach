"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { PatientInfoModal, type PatientInfoValues } from "@/components/app/PatientInfoModal";
import { PatientRecordsModal } from "@/components/app/PatientRecordsModal";
import { apiGet, apiPost } from "@/lib/client/api";
import { isCertificatePurpose, visitPurposeLabel } from "@/lib/constants";

/**
 * Quick-service procedure page (spec §7 — visit purposes). Nebulisation,
 * dressing, BP checkup and outside injection skip the full consultation and
 * capture only their own fields. Certificate has its own screen; a plain
 * consultation/follow-up falls back to the consult page — this route redirects
 * to the right place if it's opened for a non-procedure visit.
 */

// Field definitions — a flat form-state keyed by these ids; each maps to a
// visit / oe / procedure / patient field on save (see buildAndSave).
type FieldId =
  | "nebuliserAgent" | "injectionDetails" | "woundSpec" | "mechanismOfInjury"
  | "dressingNotes" | "provisionalDiagnosis" | "followUp" | "bp" | "referredBy" | "fees";

const FIELD_DEFS: Record<FieldId, {
  label: string; placeholder?: string; multiline?: boolean; numeric?: boolean; unit?: string;
}> = {
  nebuliserAgent:       { label: "Nebulising agent", placeholder: "Drug / solution nebulised — e.g. Budesonide, Salbutamol + Ipratropium" },
  injectionDetails:     { label: "Injection name & details", placeholder: "e.g. Inj. Diclofenac 75mg IM, right gluteal", multiline: true },
  woundSpec:            { label: "Wound specifications", placeholder: "Site, size, depth, appearance", multiline: true },
  mechanismOfInjury:    { label: "Mechanism of injury", placeholder: "How the wound was caused — e.g. RTA, cut by knife" },
  dressingNotes:        { label: "Dressing notes", placeholder: "Cleaning, dressing material, next change", multiline: true },
  provisionalDiagnosis: { label: "Provisional diagnosis", placeholder: "" },
  followUp:             { label: "Follow-up", placeholder: "e.g. 3 days" },
  bp:                   { label: "BP", placeholder: "120/80", unit: "mmHg" },
  referredBy:           { label: "Referred by", placeholder: "Referring doctor / source" },
  fees:                 { label: "Fees (₹)", numeric: true },
};

// Which fields each purpose shows, in order.
const PROCEDURE_FORMS: Record<string, { title: string; fields: FieldId[] }> = {
  nebulisation:      { title: "Nebulisation",      fields: ["nebuliserAgent", "followUp", "provisionalDiagnosis", "referredBy", "fees"] },
  dressing:          { title: "Dressing",          fields: ["woundSpec", "mechanismOfInjury", "dressingNotes", "followUp", "fees"] },
  bp_checkup:        { title: "BP checkup",         fields: ["bp", "followUp", "fees"] },
  outside_injection: { title: "Outside injection", fields: ["injectionDetails", "referredBy", "provisionalDiagnosis", "fees"] },
};

const PROCEDURE_FIELD_IDS = ["nebuliserAgent", "injectionDetails", "woundSpec", "mechanismOfInjury", "dressingNotes"] as const;

type Values = Record<FieldId, string>;

const emptyPatientInfo: PatientInfoValues = {
  name: "", gender: "", ageYears: "", mobile: "", emergencyContact: "", address: "",
};

const emptyValues: Values = {
  nebuliserAgent: "", injectionDetails: "", woundSpec: "", mechanismOfInjury: "",
  dressingNotes: "", provisionalDiagnosis: "", followUp: "", bp: "", referredBy: "", fees: "",
};

export default function ProcedurePage() {
  const { visitId } = useParams<{ visitId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visitMode, setVisitMode] = useState<string>("");
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientInfo, setPatientInfo] = useState<PatientInfoValues>(emptyPatientInfo);
  const [values, setValues] = useState<Values>(emptyValues);
  const [status, setStatus] = useState<"draft" | "confirmed">("draft");
  const [infoOpen, setInfoOpen] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);
  // Preserve any vitals captured at registration so BP checkup's oe write merges
  // instead of dropping them.
  const initialOe = useRef<Record<string, string>>({});

  const [saveBusy, setSaveBusy] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [amountPaid, setAmountPaid] = useState("");

  useEffect(() => {
    apiGet<{ visit: Record<string, unknown>; patient: Record<string, unknown> }>(`/api/visits/${visitId}`)
      .then(({ visit, patient }) => {
        const mode = (visit.visitMode as string) ?? "consultation";
        // Redirect visits that aren't a procedure to their proper screen.
        if (isCertificatePurpose(mode)) {
          router.replace(`/app/records/${String(patient._id)}/certificate?visitId=${visitId}`);
          return;
        }
        if (!PROCEDURE_FORMS[mode]) {
          router.replace(`/app/consult/${visitId}`);
          return;
        }
        setVisitMode(mode);
        setPatientId(String(patient._id));
        setStatus((visit.status as "draft" | "confirmed") ?? "draft");
        setPatientInfo({
          name: (patient.name as string) ?? "",
          gender: (patient.gender as string) ?? "",
          ageYears: patient.ageYears != null ? String(patient.ageYears) : "",
          mobile: (patient.mobile as string) ?? "",
          emergencyContact: (patient.emergencyContact as string) ?? "",
          address: (patient.address as string) ?? "",
        });
        const oe = (visit.oe as Record<string, string>) ?? {};
        initialOe.current = oe;
        const proc = (visit.procedure as Record<string, string>) ?? {};
        setValues({
          nebuliserAgent: proc.nebuliserAgent ?? "",
          injectionDetails: proc.injectionDetails ?? "",
          woundSpec: proc.woundSpec ?? "",
          mechanismOfInjury: proc.mechanismOfInjury ?? "",
          dressingNotes: proc.dressingNotes ?? "",
          provisionalDiagnosis: (visit.provisionalDiagnosis as string) ?? "",
          followUp: (visit.followUp as string) ?? "",
          bp: oe.bp ?? "",
          referredBy: (patient.referredBy as string) ?? "",
          fees: visit.fees != null ? String(visit.fees) : "",
        });
        setLoading(false);
      })
      .catch((e) => { setError((e as Error).message); setLoading(false); });
  }, [visitId, router]);

  const config = PROCEDURE_FORMS[visitMode];

  function setValue(id: FieldId, v: string) {
    setValues((prev) => ({ ...prev, [id]: v }));
  }

  // Save & complete. When a fee is charged we open the payment step FIRST — the
  // visit stays an editable draft until the doctor confirms there, so cancelling
  // the modal returns to the form with nothing saved. With no fee there's nothing
  // to capture, so complete immediately.
  function onSaveClick() {
    if (!config) return;
    const fee = Number(values.fees) || 0;
    if (config.fields.includes("fees") && fee > 0) {
      setError(null);
      setAmountPaid(values.fees);
      setSuccessOpen(true);
    } else {
      void completeVisit("0");
    }
  }

  // The point of no return: persist referred-by, confirm the visit, capture any
  // payment, then leave. Until this runs the visit is an editable draft.
  async function completeVisit(paidStr: string) {
    if (!config || !patientId) return;
    setSaveBusy(true);
    setError(null);
    try {
      // Demographics are edited via the Patient Info modal; here we only persist
      // referred-by when this form collects it.
      if (config.fields.includes("referredBy")) {
        const pres = await fetch(`/api/patients/${patientId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referredBy: values.referredBy.trim() }),
        });
        if (!pres.ok) {
          const d = await pres.json().catch(() => ({}));
          throw new Error(d.error ?? "Could not save referral.");
        }
      }

      // Confirm the visit with only this purpose's fields.
      const procedure: Record<string, string> = {};
      for (const id of PROCEDURE_FIELD_IDS) {
        if (config.fields.includes(id) && values[id].trim()) procedure[id] = values[id].trim();
      }
      const payload: Record<string, unknown> = {};
      if (config.fields.includes("provisionalDiagnosis")) payload.provisionalDiagnosis = values.provisionalDiagnosis.trim() || undefined;
      if (config.fields.includes("followUp")) payload.followUp = values.followUp.trim() || undefined;
      if (config.fields.includes("fees")) payload.fees = values.fees ? Number(values.fees) : undefined;
      if (config.fields.includes("bp")) payload.oe = { ...initialOe.current, bp: values.bp.trim() || undefined };
      if (Object.keys(procedure).length) payload.procedure = procedure;

      await apiPost(`/api/visits/${visitId}/confirm`, payload);

      // Capture the payment now that the fee is persisted server-side.
      const fee = Number(values.fees) || 0;
      if (fee > 0) {
        const paid = Math.max(0, Math.min(Number(paidStr) || 0, fee));
        try {
          await apiPost("/api/dues", { visitId, amountPaid: paid });
        } catch { /* swallow — settle later on the Dues page */ }
      }

      router.push("/app/queue");
    } catch (e) {
      setError((e as Error).message);
      setSaveBusy(false);
    }
  }

  if (loading) return <ProcedureSkeleton />;
  if (!config) return null; // redirecting

  const feeNum = Number(values.fees) || 0;
  const paidNum = Math.max(0, Math.min(Number(amountPaid) || 0, feeNum));
  const dueNum = feeNum - paidNum;

  return (
    <>
      <div className="space-y-4">
      {/* Header — patient name + purpose, with Patient Info / Records buttons
          (same affordances as the consult screen). */}
      <Card className="flex flex-col justify-center gap-2 p-4 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-ink">{patientInfo.name || "Patient"}</h1>
            <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
              {visitPurposeLabel(visitMode)}
            </span>
          </div>
          <p className="text-sm text-ink-muted">
            {[patientInfo.gender, patientInfo.ageYears ? `${patientInfo.ageYears}y` : ""].filter(Boolean).join(" · ") || `${config.title} visit`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setInfoOpen(true)}
            className="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-line/30"
          >
            Patient Info
          </button>
          <button
            onClick={() => setRecordsOpen(true)}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-fg hover:opacity-90"
          >
            Records
          </button>
          <button onClick={() => router.push("/app/queue")} className="ml-auto text-sm text-ink-muted hover:underline lg:hidden">
            ← Queue
          </button>
        </div>
      </Card>

      {error && <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos" role="alert">{error}</p>}

      {status === "confirmed" && !successOpen && (
        <Card className="border-success/40 bg-success/5">
          <p className="font-semibold text-success">✓ Visit confirmed and saved.</p>
        </Card>
      )}

      {/* Procedure fields */}
      <Card className="space-y-3">
        <p className="text-sm font-semibold text-ink">{config.title}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {config.fields.map((id) => (
            <ProcedureField key={id} id={id} value={values[id]} onChange={(v) => setValue(id, v)} />
          ))}
        </div>
      </Card>

      <div className="flex gap-3 rounded-2xl border border-line bg-surface-raised p-3 shadow-lg">
        <Button variant="ghost" size="lg" className="min-w-[30%]" onClick={() => router.push("/app/queue")} disabled={saveBusy}>
          Cancel
        </Button>
        <Button variant="primary" size="lg" className="flex-1" onClick={onSaveClick} disabled={saveBusy || status === "confirmed"}>
          {saveBusy ? "Saving…" : status === "confirmed" ? "Saved" : "Save & complete visit"}
        </Button>
      </div>
      </div>

      {/* Payment + confirm step. The ✕ (or backdrop) cancels back to the still-
          editable form; the visit is only saved by the confirm button below. */}
      {successOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !saveBusy) setSuccessOpen(false); }}
        >
          <div className="relative w-full max-w-sm space-y-4 rounded-2xl bg-surface p-6 text-center shadow-xl">
            <button
              type="button"
              onClick={() => setSuccessOpen(false)}
              disabled={saveBusy}
              className="absolute right-3 top-3 text-lg text-ink-muted hover:text-sos disabled:opacity-40"
              aria-label="Cancel and go back to edit"
            >
              ✕
            </button>
            <div>
              <p className="text-lg font-semibold text-ink">Complete {config.title.toLowerCase()} visit</p>
              <p className="mt-1 text-sm text-ink-muted">Record the payment, then confirm. Tap ✕ to go back and make changes.</p>
            </div>

            <div className="rounded-xl border border-line bg-surface-raised p-3 text-left">
              <div className="flex items-center justify-between">
                <label htmlFor="amount-paid" className="text-xs font-medium uppercase tracking-wider text-ink-muted">Amount paid (₹)</label>
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

            {error && <p className="rounded-xl bg-sos/10 px-3 py-2 text-left text-sm text-sos" role="alert">{error}</p>}

            <Button variant="brand" size="lg" className="w-full" onClick={() => completeVisit(amountPaid)} disabled={saveBusy}>
              {saveBusy ? "Saving…" : "Complete visit"}
            </Button>
            <button type="button" onClick={() => completeVisit("0")} disabled={saveBusy} className="w-full text-sm font-semibold text-ink-muted hover:underline disabled:opacity-40">
              Skip — leave ₹{feeNum} as a due
            </button>
          </div>
        </div>
      )}

      {patientId && (
        <>
          <PatientInfoModal
            open={infoOpen}
            onClose={() => setInfoOpen(false)}
            patientId={patientId}
            initial={patientInfo}
            onSaved={(v) => setPatientInfo(v)}
          />
          <PatientRecordsModal
            open={recordsOpen}
            onClose={() => setRecordsOpen(false)}
            patientId={patientId}
            excludeVisitId={visitId}
          />
        </>
      )}
    </>
  );
}

function ProcedureField({ id, value, onChange }: { id: FieldId; value: string; onChange: (v: string) => void }) {
  const def = FIELD_DEFS[id];
  const full = def.multiline;
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <Label htmlFor={`f-${id}`}>{def.label}</Label>
      {def.multiline ? (
        <textarea
          id={`f-${id}`}
          value={value}
          placeholder={def.placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full resize-y rounded-xl border border-line bg-surface-raised px-3.5 py-2.5 text-base text-ink placeholder:text-ink-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        />
      ) : (
        <div className="relative">
          <Input
            id={`f-${id}`}
            value={value}
            placeholder={def.placeholder}
            inputMode={def.numeric ? "numeric" : undefined}
            onChange={(e) => onChange(def.numeric ? e.target.value.replace(/[^\d]/g, "") : e.target.value)}
            className={def.unit && value ? "pr-14" : ""}
          />
          {def.unit && value && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-muted">{def.unit}</span>
          )}
        </div>
      )}
    </div>
  );
}

function ProcedureSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-56" />
      <Card className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
        </div>
      </Card>
      <Card className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
        </div>
      </Card>
    </div>
  );
}
