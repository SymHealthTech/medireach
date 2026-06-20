"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { apiPost } from "@/lib/client/api";
import { whatsappLink } from "@/lib/marketing";

/**
 * Lead capture form (spec §4 "Lead capture"): a 3-field form (name, clinic,
 * phone) that lands in the admin Leads queue, plus a direct WhatsApp option —
 * matching the high-touch, WhatsApp-first sales reality. No account creation.
 */
export function LeadForm() {
  const [form, setForm] = useState({ name: "", clinicName: "", phone: "" });
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPost("/api/leads", { ...form, source: "form" });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-success/40 bg-success/5 p-6 text-center">
        <p className="font-semibold text-success">Thanks! We&apos;ll reach out shortly.</p>
        <p className="mt-1 text-sm text-ink-muted">Prefer to chat now?</p>
        <a href={whatsappLink()} target="_blank" rel="noopener" className="mt-3 inline-block rounded-xl bg-[#25D366] px-5 py-2.5 font-semibold text-white">
          Message us on WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-surface-raised p-6">
      <h3 className="text-lg font-bold text-ink">Get a free demo</h3>
      {error && <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos">{error}</p>}
      <div>
        <Label htmlFor="ln">Your name</Label>
        <Input id="ln" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div>
        <Label htmlFor="lc">Clinic name</Label>
        <Input id="lc" value={form.clinicName} onChange={(e) => setForm({ ...form, clinicName: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="lp">Phone / WhatsApp</Label>
        <Input id="lp" inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
      </div>
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
        {loading ? "Sending…" : "Request a demo"}
      </Button>
      <p className="text-center text-xs text-ink-muted">
        or{" "}
        <a href={whatsappLink()} target="_blank" rel="noopener" className="text-brand underline">
          message us on WhatsApp
        </a>
      </p>
    </form>
  );
}
