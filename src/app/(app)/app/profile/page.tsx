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
  designation: string;
  services: string[];
  clinicName: string;
  clinicAddress: string;
  clinicStateCode: string;
  clinicTimings: string;
}

/** Comma/Enter-driven chip input for a short list of tags (services). */
function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const next = [...value];
    for (const p of parts) {
      if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p);
    }
    onChange(next);
    setDraft("");
  }

  return (
    <div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit(draft);
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" onClick={() => commit(draft)}>
          Add
        </Button>
      </div>
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== tag))}
                className="text-brand/60 hover:text-brand"
                aria-label={`Remove ${tag}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
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

  function set<K extends keyof Profile>(k: K, v: Profile[K]) {
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
          designation: form.designation,
          services: form.services,
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
          ] as const).map(([key, label]) => (
            <div key={key}>
              <Label htmlFor={key}>{label}</Label>
              <Input id={key} value={form[key] as string} onChange={(e) => set(key, e.target.value)} />
            </div>
          ))}
          <div>
            <Label htmlFor="designation">Designation</Label>
            <Input
              id="designation"
              value={form.designation}
              onChange={(e) => set("designation", e.target.value)}
              placeholder="e.g. General Physician"
            />
            <p className="mt-1 text-xs text-ink-muted">
              Shown under your name on your prescription and certificate header.
            </p>
          </div>
          <div>
            <Label>Services</Label>
            <TagInput
              value={form.services}
              onChange={(v) => set("services", v)}
              placeholder="e.g. Diabetes Care"
            />
            <p className="mt-1 text-xs text-ink-muted">
              Services you offer — shown on your prescription header. Press Enter or comma to add.
            </p>
          </div>
          {([
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
