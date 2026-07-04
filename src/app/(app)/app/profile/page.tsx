"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiGet } from "@/lib/client/api";

interface Profile {
  appId: string | null;
  name: string;
  mobile: string;
  registrationNumber: string;
  degree: string;
  clinicName: string;
  clinicAddress: string;
  clinicTimings: string;
}

/** Profile (spec §12) — editable doctor + clinic details; app ID shown. */
export default function ProfilePage() {
  const [form, setForm] = useState<Profile | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<Profile>("/api/profile").then(setForm).catch(() => {});
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
          name: form.name,
          registrationNumber: form.registrationNumber,
          degree: form.degree,
          clinicName: form.clinicName,
          clinicAddress: form.clinicAddress,
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
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Profile</h1>
        <p className="text-sm text-ink-muted">ID: {form.appId ?? "—"}</p>
      </div>
      {msg && <p className="rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand">{msg}</p>}
      <Card>
        <form onSubmit={save} className="space-y-4">
          <div>
            <Label htmlFor="mobile">Mobile number</Label>
            <Input id="mobile" value={form.mobile ?? ""} readOnly className="opacity-60 cursor-not-allowed" />
          </div>
          {([
            ["name", "Doctor name"],
            ["registrationNumber", "Registration number"],
            ["degree", "Degree / qualification"],
            ["clinicName", "Clinic name"],
            ["clinicAddress", "Clinic address"],
            ["clinicTimings", "Clinic timings"],
          ] as const).map(([key, label]) => (
            <div key={key}>
              <Label htmlFor={key}>{label}</Label>
              <Input id={key} value={form[key] as string} onChange={(e) => set(key, e.target.value)} />
            </div>
          ))}
          <Button type="submit" variant="brand" size="lg" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
