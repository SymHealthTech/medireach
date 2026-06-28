"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiGet } from "@/lib/client/api";

const TARGETS = [
  {
    v: "patient",
    l: "The patient's own number",
    d: "Default — sends to the patient.",
    field: null as null,
    placeholder: "",
  },
  {
    v: "clinic",
    l: "The clinic's number",
    d: "Useful if the clinic forwards prescriptions.",
    field: "clinicWhatsapp" as const,
    placeholder: "e.g. 9876543210",
  },
  {
    v: "receptionist",
    l: "The receptionist's number",
    d: "Front desk handles delivery.",
    field: "receptionistWhatsapp" as const,
    placeholder: "e.g. 9876543210",
  },
  {
    v: "store",
    l: "A medical store's number",
    d: "A partner pharmacy prints/handles it.",
    field: "storeWhatsapp" as const,
    placeholder: "e.g. 9876543210",
  },
];

type NumberField = "clinicWhatsapp" | "receptionistWhatsapp" | "storeWhatsapp";

type ProfileData = {
  mobile: string;
  defaultWhatsappTarget: string;
  clinicWhatsapp: string;
  receptionistWhatsapp: string;
  storeWhatsapp: string;
  prescriptionSendNumber: string;
};

/** WhatsApp delivery defaults (spec §7.5, §12). */
export default function WhatsappDefaultPage() {
  const [target, setTarget] = useState("patient");
  const [numbers, setNumbers] = useState<Record<NumberField, string>>({
    clinicWhatsapp: "",
    receptionistWhatsapp: "",
    storeWhatsapp: "",
  });
  const [sendNumber, setSendNumber] = useState("");
  const [doctorMobile, setDoctorMobile] = useState("");
  const [targetMsg, setTargetMsg] = useState<string | null>(null);
  const [sendMsg, setSendMsg] = useState<string | null>(null);
  const [targetBusy, setTargetBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);

  useEffect(() => {
    apiGet<ProfileData>("/api/profile")
      .then((d) => {
        setTarget(d.defaultWhatsappTarget);
        setNumbers({
          clinicWhatsapp: d.clinicWhatsapp,
          receptionistWhatsapp: d.receptionistWhatsapp,
          storeWhatsapp: d.storeWhatsapp,
        });
        setSendNumber(d.prescriptionSendNumber);
        setDoctorMobile(d.mobile);
      })
      .catch(() => {});
  }, []);

  function setNumber(field: NumberField, value: string) {
    setNumbers((prev) => ({ ...prev, [field]: value }));
  }

  async function saveTarget() {
    setTargetBusy(true);
    setTargetMsg(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultWhatsappTarget: target, ...numbers }),
    });
    setTargetMsg(res.ok ? "Saved." : "Save failed.");
    setTargetBusy(false);
  }

  async function saveSendNumber() {
    setSendBusy(true);
    setSendMsg(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prescriptionSendNumber: sendNumber }),
    });
    setSendMsg(res.ok ? "Saved." : "Save failed.");
    setSendBusy(false);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink">WhatsApp delivery default</h1>

      {/* ── Delivery target ─────────────────────────────────── */}
      <Card className="space-y-4">
        <p className="font-medium text-ink">Send prescription to</p>
        {targetMsg && (
          <p className="rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand">{targetMsg}</p>
        )}
        <div className="space-y-3">
          {TARGETS.map((t) => (
            // Outer div owns the border; flex-col on mobile, flex-row on desktop.
            <div
              key={t.v}
              className="flex flex-col gap-2 rounded-xl border border-line p-3 sm:flex-row sm:items-center sm:gap-4"
            >
              {/* Radio + label text — takes all available space on desktop */}
              <label className="flex flex-1 cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name="target"
                  checked={target === t.v}
                  onChange={() => setTarget(t.v)}
                  className="mt-1 h-5 w-5 shrink-0 accent-[#0E7C7B]"
                />
                <span>
                  <span className="block font-medium text-ink">{t.l}</span>
                  <span className="block text-sm text-ink-muted">{t.d}</span>
                </span>
              </label>

              {/* Number input — indented on mobile to align with text, fixed width on desktop */}
              {t.field && (
                <div className="ml-8 sm:ml-0 sm:w-44 sm:shrink-0">
                  <Input
                    type="tel"
                    placeholder={t.placeholder}
                    value={numbers[t.field]}
                    onChange={(e) => setNumber(t.field!, e.target.value)}
                    maxLength={20}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <Button variant="brand" onClick={saveTarget} disabled={targetBusy}>
          Save
        </Button>
      </Card>

      {/* ── Sending number ───────────────────────────────────── */}
      <Card className="space-y-3">
        {sendMsg && (
          <p className="rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand">{sendMsg}</p>
        )}
        <div>
          <p className="font-medium text-ink">Send prescription from this number</p>
          <p className="mt-0.5 text-sm text-ink-muted">
            The WhatsApp number used to send prescriptions. Defaults to your registered number.
            Change this if you send from a different WhatsApp (e.g. a clinic shared number).
          </p>
        </div>
        <div className="space-y-1.5">
          <Input
            type="tel"
            placeholder={doctorMobile || "e.g. 9876543210"}
            value={sendNumber}
            onChange={(e) => setSendNumber(e.target.value)}
            maxLength={20}
          />
          {doctorMobile && (
            <p className="text-xs text-ink-muted">Registered: {doctorMobile}</p>
          )}
        </div>
        <Button variant="brand" onClick={saveSendNumber} disabled={sendBusy}>
          Save number
        </Button>
      </Card>
    </div>
  );
}
