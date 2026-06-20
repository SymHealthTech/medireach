"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { apiPost } from "@/lib/client/api";

/**
 * Public DPDP grievance form (spec §15.8). A simple, always-available data-
 * complaint channel that lands in the admin grievance queue.
 */
const KINDS = [
  { v: "access", l: "Access my data" },
  { v: "erasure", l: "Delete my data" },
  { v: "correction", l: "Correct my data" },
  { v: "consent-withdrawal", l: "Withdraw consent" },
  { v: "other", l: "Other" },
];

export function GrievanceForm() {
  const [form, setForm] = useState({ contactEmail: "", contactName: "", kind: "other", message: "" });
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiPost("/api/grievances", form);
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (done) {
    return (
      <p className="rounded-2xl border border-success/40 bg-success/5 p-4 text-sm text-success">
        Thank you — your request has been logged and we&apos;ll respond as required.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-line bg-surface-raised p-6">
      <h3 className="font-bold text-ink">Raise a data request or complaint</h3>
      {error && <p className="text-sm text-sos">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="gn">Your name</Label>
          <Input id="gn" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="ge">Email</Label>
          <Input id="ge" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} required />
        </div>
      </div>
      <div>
        <Label htmlFor="gk">Request type</Label>
        <select
          id="gk"
          value={form.kind}
          onChange={(e) => setForm({ ...form, kind: e.target.value })}
          className="h-12 w-full rounded-xl border border-line bg-surface-raised px-3.5 text-base text-ink"
        >
          {KINDS.map((k) => (
            <option key={k.v} value={k.v}>{k.l}</option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="gm">Details</Label>
        <Textarea id="gm" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
      </div>
      <Button type="submit" variant="brand">Submit request</Button>
    </form>
  );
}
