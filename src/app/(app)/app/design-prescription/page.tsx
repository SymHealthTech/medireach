"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { apiGet, apiPost } from "@/lib/client/api";
import { TEMPLATE_PRESETS } from "@/lib/prescription/presets";
import { renderPrescriptionImage } from "@/lib/client/prescriptionImage";
import { cn } from "@/lib/cn";

interface TemplateState {
  presetKey: string;
  clinicNameOverride: string;
  logoPlacement: "left" | "center" | "right";
  logoStyle: "caduceus" | "plus";
  designation: string;
  services: string[];
  footer: { storeName?: string; storeAddress?: string; storeContact?: string };
}

const LOGO_OPTIONS: { key: TemplateState["logoStyle"]; label: string; description: string; icon: string }[] = [
  { key: "caduceus", label: "Caduceus", description: "Two snakes on a staff — classical medical symbol", icon: "⚕" },
  { key: "plus", label: "Medical Cross", description: "Bold plus sign — universally recognized healthcare icon", icon: "✚" },
];

interface Clinic {
  clinicName: string;
  clinicAddress: string;
  clinicTimings: string;
  doctorName: string;
  degree: string;
  registrationNumber: string;
}

/**
 * Design Prescription (spec §8, §12). Pick a preset, lightly customize clinic
 * name + logo placement, and manage the sponsor footer ad slot — with a live
 * preview of the exact image that will be shared on WhatsApp. Also issues the
 * shareable payment link to the sponsoring store (§8).
 */
export default function DesignPrescriptionPage() {
  const [tpl, setTpl] = useState<TemplateState | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [servicesInput, setServicesInput] = useState("");

  useEffect(() => {
    apiGet<{ template: TemplateState; clinic: Clinic }>("/api/template").then((d) => {
      setTpl(d.template);
      setClinic(d.clinic);
      setServicesInput((d.template.services ?? []).join(", "));
    });
  }, []);

  const renderPreview = useCallback(async () => {
    if (!tpl || !clinic) return;
    const blob = await renderPrescriptionImage({
      presetKey: tpl.presetKey,
      logoPlacement: tpl.logoPlacement,
      logoStyle: tpl.logoStyle ?? "caduceus",
      clinicName: tpl.clinicNameOverride || clinic.clinicName || "Your Clinic",
      clinicAddress: clinic.clinicAddress,
      doctorName: clinic.doctorName,
      registrationNumber: clinic.registrationNumber,
      degree: clinic.degree,
      designation: tpl.designation || undefined,
      services: tpl.services?.length ? tpl.services : undefined,
      clinicTimings: clinic.clinicTimings,
      patientName: "Sample Patient",
      patientMeta: "Male · 34y",
      date: new Date().toLocaleDateString("en-IN"),
      diagnosis: "Viral fever",
      medicines: [
        "Paracetamol 500mg — Take 3 times a day after food",
        "Cough syrup — 10ml twice a day",
      ],
      footer: tpl.footer,
    });
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
  }, [tpl, clinic]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  function patch<K extends keyof TemplateState>(k: K, v: TemplateState[K]) {
    setTpl((t) => (t ? { ...t, [k]: v } : t));
  }

  async function save() {
    if (!tpl) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/template", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tpl),
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
    try {
      await apiPost("/api/sponsor", {
        storeName: tpl.footer.storeName,
        contactNumber: tpl.footer.storeContact,
        footerContent: tpl.footer.storeAddress ?? "",
      });
      setMsg("Sponsor saved.");
    } catch (e) {
      setMsg((e as Error).message);
    }
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

  if (!tpl || !clinic) return <p className="text-ink-muted">Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Design Prescription</h1>
      {msg && <p className="rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand">{msg}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="space-y-5">
          <Card className="space-y-3">
            <p className="text-sm font-semibold text-ink">Template</p>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATE_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => patch("presetKey", p.key)}
                  className={cn(
                    "rounded-xl border p-3 text-left",
                    tpl.presetKey === p.key ? "border-brand ring-2 ring-brand" : "border-line",
                  )}
                >
                  <span className="block h-2 w-12 rounded" style={{ background: p.accent }} />
                  <span className="mt-2 block font-medium text-ink">{p.name}</span>
                  <span className="block text-xs text-ink-muted">{p.description}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="space-y-3">
            <p className="text-sm font-semibold text-ink">Customize</p>
            <div>
              <Label htmlFor="cn">Clinic name override</Label>
              <Input
                id="cn"
                placeholder={clinic.clinicName}
                value={tpl.clinicNameOverride}
                onChange={(e) => patch("clinicNameOverride", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="desig">Designation</Label>
              <Input
                id="desig"
                placeholder="General Physician."
                value={tpl.designation ?? ""}
                onChange={(e) => patch("designation", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="lp">Logo placement</Label>
              <select
                id="lp"
                value={tpl.logoPlacement}
                onChange={(e) => patch("logoPlacement", e.target.value as TemplateState["logoPlacement"])}
                className="h-12 w-full rounded-xl border border-line bg-surface-raised px-3.5 text-base text-ink"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div>
              <Label>Doctor logo style</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {LOGO_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => patch("logoStyle", opt.key)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors",
                      (tpl.logoStyle ?? "caduceus") === opt.key
                        ? "border-brand bg-brand/5 ring-2 ring-brand"
                        : "border-line hover:border-brand/50",
                    )}
                  >
                    <span className="text-3xl leading-none">{opt.icon}</span>
                    <span className="mt-1 block text-sm font-medium text-ink">{opt.label}</span>
                    <span className="block text-xs text-ink-muted">{opt.description}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="svc">Services</Label>
              <p className="mb-1.5 text-xs text-ink-muted">Comma-separated — shown in header as Service A | Service B</p>
              <Input
                id="svc"
                placeholder="General Medicine, Pediatrics, Cardiology"
                value={servicesInput}
                onChange={(e) => setServicesInput(e.target.value)}
                onBlur={(e) =>
                  patch(
                    "services",
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
              />
            </div>
          </Card>

          <Card className="space-y-3">
            <p className="text-sm font-semibold text-ink">Sponsor footer (ad slot)</p>
            <p className="text-xs text-ink-muted">
              A sponsoring medical store can pay your subscription in exchange for this footer.
            </p>
            <Input
              placeholder="Store name"
              value={tpl.footer?.storeName ?? ""}
              onChange={(e) => patch("footer", { ...tpl.footer, storeName: e.target.value })}
            />
            <Input
              placeholder="Store address"
              value={tpl.footer?.storeAddress ?? ""}
              onChange={(e) => patch("footer", { ...tpl.footer, storeAddress: e.target.value })}
            />
            <Input
              placeholder="Store contact number"
              inputMode="numeric"
              value={tpl.footer?.storeContact ?? ""}
              onChange={(e) => patch("footer", { ...tpl.footer, storeContact: e.target.value })}
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

        {/* Sticky column: on desktop fills viewport height below the header */}
        <div className="lg:sticky lg:top-[57px] lg:flex lg:h-[calc(100vh-57px)] lg:flex-col lg:py-6">
          <p className="mb-2 shrink-0 text-sm font-semibold text-ink">
            Preview{" "}
            <span className="ml-1 text-xs font-normal text-ink-muted">(A5 paper size)</span>
          </p>

          {/* Mobile: width-driven, natural A5 ratio from the image itself */}
          <div className="lg:hidden overflow-hidden rounded-xl border border-line shadow-[0_4px_24px_rgba(0,0,0,0.12)]">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Prescription preview" className="block w-full" />
            ) : (
              <div className="flex aspect-[148/210] w-full items-center justify-center text-sm text-ink-muted">
                Generating…
              </div>
            )}
          </div>

          {/* Desktop: flex-1 takes remaining height; inner div is exact A5 ratio (h-full w-auto)
               so the image fills edge-to-edge with no letterbox gutters and no scroll */}
          <div className="hidden min-h-0 flex-1 lg:flex lg:items-start">
            <div
              className="h-full w-auto overflow-hidden rounded-xl border border-line shadow-[0_4px_24px_rgba(0,0,0,0.12)]"
              style={{ aspectRatio: "148/210" }}
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Prescription preview" className="block h-full w-full" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-ink-muted">
                  Generating…
                </div>
              )}
            </div>
          </div>

          <p className="mt-2 shrink-0 text-center text-xs text-ink-muted">
            Actual printed / shared size will match this paper ratio
          </p>
        </div>
      </div>
    </div>
  );
}
