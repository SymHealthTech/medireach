"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SpinnerBlock } from "@/components/ui/Spinner";
import { apiGet, apiPost } from "@/lib/client/api";
import { uploadSigned } from "@/lib/client/upload";
import { TEMPLATES, type TemplateId } from "@/lib/prescription/templates";
import { PrescriptionPreview } from "@/components/prescription/PrescriptionPreview";
import type { PrescriptionSheetData } from "@/components/prescription/PrescriptionSheet";
import { imageUrlToDataUrl, printSheet } from "@/lib/client/prescriptionRaster";
import { cn } from "@/lib/cn";

interface Footer {
  storeName?: string;
  storeAddress?: string;
  storeContact?: string;
}
interface TemplateState {
  presetKey: string;
  footer: Footer;
  signaturePublicId: string;
  signatureUrl: string;
}
interface Clinic {
  clinicName: string;
  clinicAddress: string;
  clinicTimings: string;
  clinicMobile: string;
  doctorName: string;
  degree: string;
  registrationNumber: string;
}

// Sample consultation used only to populate the live preview with the doctor's
// real header/footer — it demonstrates conditional vitals and the dose grid
// (whole-tablet TDS, syrup tsf BD, once-a-day) without touching real data.
const SAMPLE_OE = { bp: "120/80", temp: "99", weight: "62" };
const SAMPLE_MEDICINES = [
  { type: "Tab", name: "Crocin", generic: "Paracetamol 500mg", dose: "1", frequency: "TDS", timing: "After food" },
  { type: "Syr", name: "Ambroxol", generic: "Ambroxol 30mg/5ml", dose: "1tsf", frequency: "BD", timing: "Before food" },
  { type: "Tab", name: "Pan-D", generic: "Pantoprazole 40mg", dose: "1", frequency: "OD", timing: "Before breakfast" },
];

/**
 * Design Prescription (spec §8 redesign). The customise screen contains ONLY a
 * template picker, an optional signature upload, and the sponsor pharmacy
 * details — no logo or services options. The preview is the exact A4 sheet that
 * prints and ships on WhatsApp.
 */
export default function DesignPrescriptionPage() {
  const [tpl, setTpl] = useState<TemplateState | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiGet<{ template: TemplateState; clinic: Clinic }>("/api/template").then(async (d) => {
      setTpl(d.template);
      setClinic(d.clinic);
      if (d.template.signatureUrl) {
        setSignatureDataUrl(await imageUrlToDataUrl(d.template.signatureUrl));
      }
    });
  }, []);

  const previewData: PrescriptionSheetData | null = useMemo(() => {
    if (!tpl || !clinic) return null;
    return {
      templateId: tpl.presetKey,
      doctor: {
        name: clinic.doctorName || "Your Name",
        degree: clinic.degree,
        registrationNumber: clinic.registrationNumber,
        clinicName: clinic.clinicName || "Your Clinic",
        clinicAddress: clinic.clinicAddress,
        clinicMobile: clinic.clinicMobile,
        clinicTimings: clinic.clinicTimings,
      },
      patient: { name: "Sample Patient", ageYears: 34, gender: "male" },
      date: new Date().toLocaleDateString("en-IN"),
      oe: SAMPLE_OE,
      medicines: SAMPLE_MEDICINES,
      signatureDataUrl,
      sponsor: tpl.footer,
    };
  }, [tpl, clinic, signatureDataUrl]);

  function patchFooter(v: Partial<Footer>) {
    setTpl((t) => (t ? { ...t, footer: { ...t.footer, ...v } } : t));
  }

  async function onSignatureFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !tpl) return;
    if (file.size > 3 * 1024 * 1024) {
      setMsg("Signature image must be under 3 MB.");
      return;
    }
    setUploading(true);
    setMsg(null);
    try {
      // Show the picked image immediately, then upload for the stored public_id.
      const localUrl = await fileToDataUrl(file);
      setSignatureDataUrl(localUrl);
      const { publicId } = await uploadSigned(file, "signature");
      setTpl((t) => (t ? { ...t, signaturePublicId: publicId } : t));
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function removeSignature() {
    setSignatureDataUrl(null);
    setTpl((t) => (t ? { ...t, signaturePublicId: "" } : t));
  }

  async function save() {
    if (!tpl) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/template", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presetKey: tpl.presetKey,
          signaturePublicId: tpl.signaturePublicId,
          footer: tpl.footer,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Save failed.");
      setMsg("Saved.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function saveSponsor() {
    if (!tpl?.footer?.storeName || !tpl.footer.storeContact) {
      setMsg("Enter the store name and contact number first.");
      return;
    }
    await apiPost("/api/sponsor", {
      storeName: tpl.footer.storeName,
      contactNumber: tpl.footer.storeContact,
      footerContent: tpl.footer.storeAddress ?? "",
    });
    setMsg("Sponsor saved.");
  }

  async function sendPaymentLink() {
    setMsg(null);
    try {
      await saveSponsor();
      const { shortUrl } = await apiPost<{ shortUrl: string }>("/api/sponsor/payment-link", {});
      setLinkUrl(shortUrl);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  if (!tpl || !clinic || !previewData) return <SpinnerBlock />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Design Prescription</h1>
        <Button variant="outline" onClick={() => sheetRef.current && printSheet(sheetRef.current)}>
          Print / Save PDF
        </Button>
      </div>
      {msg && <p className="rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand">{msg}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="space-y-5">
          {/* Template picker */}
          <Card className="space-y-3">
            <p className="text-sm font-semibold text-ink">Template</p>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setTpl((t) => (t ? { ...t, presetKey: p.id } : t))}
                  className={cn(
                    "rounded-xl border p-3 text-left",
                    tpl.presetKey === (p.id as TemplateId) ? "border-brand ring-2 ring-brand" : "border-line",
                  )}
                >
                  <span className="block h-2 w-12 rounded" style={{ background: p.accent }} />
                  <span className="mt-2 block font-medium text-ink">{p.name}</span>
                  <span className="block text-xs text-ink-muted">{p.description}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Signature */}
          <Card className="space-y-3">
            <p className="text-sm font-semibold text-ink">Signature</p>
            <p className="text-xs text-ink-muted">
              Optional. When uploaded it appears above your printed name; otherwise only the name shows.
            </p>
            {signatureDataUrl ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center rounded-xl border border-line bg-surface-raised p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={signatureDataUrl} alt="Signature" className="max-h-20 object-contain" />
                </div>
                <div className="flex gap-2">
                  <label className="cursor-pointer rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-line/30">
                    {uploading ? "Uploading…" : "Replace"}
                    <input type="file" accept="image/*" onChange={onSignatureFile} disabled={uploading} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={removeSignature}
                    className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-sos hover:bg-sos/5"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-line bg-surface-raised px-3 py-6 text-sm font-semibold text-brand hover:bg-line/20">
                {uploading ? "Uploading…" : "+ Upload signature image"}
                <input type="file" accept="image/*" onChange={onSignatureFile} disabled={uploading} className="hidden" />
              </label>
            )}
          </Card>

          {/* Sponsor pharmacy */}
          <Card className="space-y-3">
            <p className="text-sm font-semibold text-ink">Sponsor pharmacy (footer)</p>
            <p className="text-xs text-ink-muted">
              A sponsoring medical store can pay your subscription in exchange for this footer.
            </p>
            <Input
              placeholder="Pharmacy name"
              value={tpl.footer?.storeName ?? ""}
              onChange={(e) => patchFooter({ storeName: e.target.value })}
            />
            <Input
              placeholder="Address"
              value={tpl.footer?.storeAddress ?? ""}
              onChange={(e) => patchFooter({ storeAddress: e.target.value })}
            />
            <Input
              placeholder="Phone number"
              inputMode="numeric"
              value={tpl.footer?.storeContact ?? ""}
              onChange={(e) => patchFooter({ storeContact: e.target.value })}
            />
            <Button variant="outline" onClick={sendPaymentLink}>
              Save sponsor &amp; send payment link
            </Button>
            {linkUrl && (
              <p className="text-sm text-success">
                Payment link:{" "}
                <a href={linkUrl} target="_blank" className="underline">
                  {linkUrl}
                </a>
              </p>
            )}
          </Card>

          <Button variant="brand" size="lg" className="w-full" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save template"}
          </Button>
        </div>

        {/* Live A4 preview */}
        <div className="lg:sticky lg:top-[57px] lg:py-6">
          <p className="mb-2 text-sm font-semibold text-ink">
            Preview <span className="ml-1 text-xs font-normal text-ink-muted">(A4 paper size)</span>
          </p>
          <PrescriptionPreview data={previewData} sheetRef={sheetRef} />
          <p className="mt-2 text-center text-xs text-ink-muted">
            This is exactly what prints and ships on WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
