"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { ChangeMobileModal } from "@/components/app/ChangeMobileModal";
import { apiGet } from "@/lib/client/api";
import { GST_STATE_CODES } from "@/lib/constants";

interface Profile {
  appId: string | null;
  name: string;
  mobile: string;
  registrationNumber: string;
  degree: string;
  clinicName: string;
  clinicAddress: string;
  clinicStateCode: string;
  clinicTimings: string;
}

/** Profile (spec §12) — editable doctor + clinic details; app ID shown. */
export default function ProfilePage() {
  const [form, setForm] = useState<Profile | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mobileModal, setMobileModal] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Profile>("/api/profile")
      .then(setForm)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Couldn't load your profile."));
  }, []);

  function set<K extends keyof Profile>(k: K, v: string) {
    setForm((f) => (f ? { ...f, [k]: v } : f));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Stored without the "Dr." prefix (the field shows it as a fixed
          // adornment) — strip it if it was typed in, so it's never doubled.
          name: form.name.trim().replace(/^dr\.?\s+/i, ""),
          registrationNumber: form.registrationNumber,
          degree: form.degree,
          clinicName: form.clinicName,
          clinicAddress: form.clinicAddress,
          clinicStateCode: form.clinicStateCode,
          clinicTimings: form.clinicTimings,
        }),
      });
      setMsg(res.ok ? "Saved." : ((await res.json().catch(() => ({}))).error ?? "Save failed."));
    } catch {
      setMsg("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loadError) return (
    <div className="space-y-5">
      <PageHeader title="Profile" />
      <Card>
        <div className="space-y-3 py-2 text-center">
          <p className="text-sm text-sos">{loadError}</p>
          <p className="text-sm text-ink-muted">
            Your session may have expired. Please sign in again.
          </p>
          <a href="/login?next=/app/profile" className="inline-block">
            <Button variant="brand">Log in again</Button>
          </a>
        </div>
      </Card>
    </div>
  );

  if (!form) return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Card>
        <div className="space-y-4">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          ))}
          <Skeleton className="h-11 w-24 rounded-xl" />
        </div>
      </Card>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Profile" subtitle={`ID: ${form.appId ?? "—"}`} />
      {msg && <p className="rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand">{msg}</p>}
      <Card>
        <form onSubmit={save} className="space-y-4">
          <div>
            <Label htmlFor="mobile">Mobile number</Label>
            <div className="flex items-center gap-2">
              <Input
                id="mobile"
                value={form.mobile ?? ""}
                readOnly
                className="flex-1 opacity-60 cursor-not-allowed"
              />
              <Button type="button" variant="secondary" onClick={() => setMobileModal(true)}>
                Change
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="name">Doctor name</Label>
            <div className="relative">
              <span
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base font-medium text-ink-muted"
                aria-hidden
              >
                Dr.
              </span>
              <Input
                id="name"
                value={form.name.replace(/^dr\.?\s+/i, "")}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Your full name"
                className="pl-11"
              />
            </div>
          </div>
          {([
            ["registrationNumber", "Registration number"],
            ["degree", "Degree / qualification"],
            ["clinicName", "Clinic name"],
            ["clinicAddress", "Clinic address"],
          ] as const).map(([key, label]) => (
            <div key={key}>
              <Label htmlFor={key}>{label}</Label>
              <Input id={key} value={form[key] as string} onChange={(e) => set(key, e.target.value)} />
            </div>
          ))}
          <div>
            <Label htmlFor="clinicStateCode">
              State <span className="font-normal text-ink-muted">(for GST / invoicing)</span>
            </Label>
            <Select
              id="clinicStateCode"
              value={form.clinicStateCode ?? ""}
              onChange={(e) => set("clinicStateCode", e.target.value)}
            >
              <option value="">Select state…</option>
              {GST_STATE_CODES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="clinicTimings">Clinic timings</Label>
            <Input
              id="clinicTimings"
              value={form.clinicTimings}
              onChange={(e) => set("clinicTimings", e.target.value)}
            />
          </div>
          <Button type="submit" variant="brand" size="lg" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </form>
      </Card>
      <ChangeMobileModal
        open={mobileModal}
        currentMobile={form.mobile ?? ""}
        onClose={() => setMobileModal(false)}
        onUpdated={(mobile) => {
          set("mobile", mobile);
          setMsg("Mobile number updated.");
        }}
      />
    </div>
  );
}
