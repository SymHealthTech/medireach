"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { apiGet } from "@/lib/client/api";

interface Profile {
  appId: string | null;
  name: string;
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
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setMsg(res.ok ? "Saved." : "Save failed.");
  }

  if (!form) return <p className="text-ink-muted">Loading…</p>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Profile</h1>
        <p className="text-sm text-ink-muted">ID: {form.appId ?? "—"}</p>
      </div>
      {msg && <p className="rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand">{msg}</p>}
      <Card>
        <form onSubmit={save} className="space-y-4">
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
          <Button type="submit" variant="brand" size="lg">Save</Button>
        </form>
      </Card>
    </div>
  );
}
