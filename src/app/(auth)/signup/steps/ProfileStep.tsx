"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { apiGet, apiPost } from "@/lib/client/api";
import { GST_STATE_CODES } from "@/lib/constants";

export function ProfileStep({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    name: "",
    registrationNumber: "",
    degree: "",
    clinicName: "",
    clinicAddress: "",
    clinicStateCode: "",
    clinicTimings: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiGet<{ name: string }>("/api/onboarding/status")
      .then((s) => setForm((f) => ({ ...f, name: s.name ?? "" })))
      .catch(() => {});
  }, []);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPost("/api/onboarding/profile", form);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-ink">Your clinic profile</h1>
        <p className="text-sm text-ink-muted">This appears on your prescriptions.</p>
      </div>

      {error && (
        <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos" role="alert">
          {error}
        </p>
      )}

      <div>
        <Label htmlFor="dname">Doctor name</Label>
        <Input id="dname" value={form.name} onChange={(e) => set("name", e.target.value)} required />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="reg">Registration number</Label>
          <Input
            id="reg"
            value={form.registrationNumber}
            onChange={(e) => set("registrationNumber", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="degree">Degree / qualification</Label>
          <Input id="degree" value={form.degree} onChange={(e) => set("degree", e.target.value)} required />
        </div>
      </div>
      <div>
        <Label htmlFor="cname">Clinic name</Label>
        <Input id="cname" value={form.clinicName} onChange={(e) => set("clinicName", e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="caddr">Clinic address</Label>
        <Input
          id="caddr"
          value={form.clinicAddress}
          onChange={(e) => set("clinicAddress", e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="cstate">State <span className="text-ink-muted font-normal">(for GST / invoicing)</span></Label>
        <Select id="cstate" value={form.clinicStateCode} onChange={(e) => set("clinicStateCode", e.target.value)}>
          <option value="">Select state…</option>
          {GST_STATE_CODES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="ctime">Clinic timings <span className="text-ink-muted font-normal">(optional)</span></Label>
        <Input
          id="ctime"
          placeholder="e.g. Mon–Sat, 10am–2pm & 5pm–9pm"
          value={form.clinicTimings}
          onChange={(e) => set("clinicTimings", e.target.value)}
        />
      </div>

      <Button type="submit" variant="brand" size="lg" className="w-full" disabled={loading}>
        {loading ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
