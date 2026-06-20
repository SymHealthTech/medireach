"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { apiGet } from "@/lib/client/api";

const TARGETS = [
  { v: "patient", l: "The patient's own number", d: "Default — sends to the patient." },
  { v: "clinic", l: "The clinic's number", d: "Useful if the clinic forwards prescriptions." },
  { v: "receptionist", l: "The receptionist's number", d: "Front desk handles delivery." },
  { v: "store", l: "A medical store's number", d: "A partner pharmacy prints/handles it." },
];

/** WhatsApp delivery default (spec §7.5, §12). */
export default function WhatsappDefaultPage() {
  const [value, setValue] = useState("patient");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ defaultWhatsappTarget: string }>("/api/profile")
      .then((d) => setValue(d.defaultWhatsappTarget))
      .catch(() => {});
  }, []);

  async function save() {
    setMsg(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultWhatsappTarget: value }),
    });
    setMsg(res.ok ? "Saved." : "Save failed.");
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink">WhatsApp delivery default</h1>
      {msg && <p className="rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand">{msg}</p>}
      <Card className="space-y-3">
        {TARGETS.map((t) => (
          <label key={t.v} className="flex items-start gap-3 rounded-xl border border-line p-3">
            <input type="radio" name="target" checked={value === t.v} onChange={() => setValue(t.v)} className="mt-1 h-5 w-5 accent-[#0E7C7B]" />
            <span>
              <span className="block font-medium text-ink">{t.l}</span>
              <span className="block text-sm text-ink-muted">{t.d}</span>
            </span>
          </label>
        ))}
        <Button variant="brand" onClick={save}>Save</Button>
      </Card>
    </div>
  );
}
