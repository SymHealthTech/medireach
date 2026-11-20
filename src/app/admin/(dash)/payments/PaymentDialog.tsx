"use client";

import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect, NumberInput, SwitchField } from "@/components/admin/form/fields";
import { FormDialog } from "@/components/admin/FormDialog";
import { PAYMENT_MODE_LABEL, PAYMENT_PURPOSE_LABEL } from "@/lib/admin/labels";
import { PAYMENT_MODES, PAYMENT_PURPOSES_V2, type PaymentPurpose } from "@/lib/constants";
import { toDateInput } from "@/lib/format";
import { recordPaymentAction } from "./actions";

type TargetKind = "doctor" | "establishment";

const PURPOSE_HELP: Partial<Record<PaymentPurpose, string>> = {
  setup: "Starts the renewal: due one year after this date.",
  doctor_addon: "Setup for a clinic/hospital doctor's portfolio. Starts that doctor's renewal.",
  renewal: "Moves the renewal date on by one year and brings a lapsed site back.",
};

/**
 * Record a payment for a doctor or a clinic/hospital. With `fixed`, the
 * target is preset (e.g. "Record renewal" on the Renewals list) and the
 * pickers are hidden.
 */
export function PaymentDialog({
  doctors = [],
  establishments = [],
  fixed,
  defaults,
  defaultDoctorId,
  defaultEstablishmentId,
  gstIncludedDefault,
  trigger,
}: {
  doctors?: { id: string; name: string }[];
  establishments?: { id: string; name: string; kind: "clinic" | "hospital" }[];
  fixed?: { kind: TargetKind; id: string; name: string };
  defaults?: { purpose?: PaymentPurpose; amount?: number };
  defaultDoctorId?: string;
  defaultEstablishmentId?: string;
  gstIncludedDefault: boolean;
  trigger?: ReactNode;
}) {
  const blank = () => ({
    kind: (fixed?.kind ?? (defaultEstablishmentId ? "establishment" : "doctor")) as TargetKind,
    doctorId: fixed?.kind === "doctor" ? fixed.id : (defaultDoctorId ?? ""),
    establishmentId: fixed?.kind === "establishment" ? fixed.id : (defaultEstablishmentId ?? ""),
    amount: defaults?.amount,
    gstIncluded: gstIncludedDefault,
    mode: "upi" as (typeof PAYMENT_MODES)[number],
    date: toDateInput(new Date()),
    purpose: defaults?.purpose ?? ("setup" as PaymentPurpose),
    invoiceNo: "",
    notes: "",
  });
  const [v, setV] = useState(blank);
  const set = (patch: Partial<ReturnType<typeof blank>>) => setV((x) => ({ ...x, ...patch }));

  return (
    <FormDialog
      trigger={
        trigger ?? (
          <Button>
            <Plus /> Record payment
          </Button>
        )
      }
      title={fixed ? `Record payment: ${fixed.name}` : "Record payment"}
      submitLabel="Record"
      successMessage="Payment recorded"
      onSubmit={() =>
        recordPaymentAction({
          doctorId: v.kind === "doctor" ? v.doctorId : "",
          establishmentId: v.kind === "establishment" ? v.establishmentId : "",
          amount: v.amount ?? 0,
          gstIncluded: v.gstIncluded,
          mode: v.mode,
          date: v.date,
          purpose: v.purpose,
          invoiceNo: v.invoiceNo,
          notes: v.notes,
        })
      }
      onSuccess={(res) => {
        if (res.renewalDue) toast.success(`${res.restored ? "Site is live again. " : ""}Renewal now due on ${res.renewalDue}.`);
        setV(blank());
      }}
    >
      {(errors) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {!fixed && (
              <>
                <Field label="For" htmlFor="p-kind">
                  <NativeSelect id="p-kind" value={v.kind} onChange={(e) => set({ kind: e.target.value as TargetKind })}>
                    <option value="doctor">Doctor</option>
                    <option value="establishment">Clinic or hospital</option>
                  </NativeSelect>
                </Field>
                {v.kind === "doctor" ? (
                  <Field label="Doctor" htmlFor="p-doctor" required error={errors.doctorId}>
                    <NativeSelect id="p-doctor" value={v.doctorId} onChange={(e) => set({ doctorId: e.target.value })}>
                      <option value="" />
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                ) : (
                  <Field label="Clinic or hospital" htmlFor="p-est" required error={errors.doctorId}>
                    <NativeSelect id="p-est" value={v.establishmentId} onChange={(e) => set({ establishmentId: e.target.value })}>
                      <option value="" />
                      {establishments.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name} ({e.kind})
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                )}
              </>
            )}
            <Field label="Purpose" htmlFor="p-purpose" help={PURPOSE_HELP[v.purpose]}>
              <NativeSelect id="p-purpose" value={v.purpose} onChange={(e) => set({ purpose: e.target.value as PaymentPurpose })}>
                {PAYMENT_PURPOSES_V2.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_PURPOSE_LABEL[m]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Amount (₹)" htmlFor="p-amount" required error={errors.amount}>
              <NumberInput id="p-amount" value={v.amount} onChange={(amount) => set({ amount })} />
            </Field>
            <Field label="Date" htmlFor="p-date" required error={errors.date}>
              <Input id="p-date" type="date" value={v.date} onChange={(e) => set({ date: e.target.value })} />
            </Field>
            <Field label="Mode" htmlFor="p-mode">
              <NativeSelect id="p-mode" value={v.mode} onChange={(e) => set({ mode: e.target.value as typeof v.mode })}>
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_MODE_LABEL[m]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Invoice no." htmlFor="p-invoice" help="Leave empty to auto-number (MR-YYYYMM-0001)." error={errors.invoiceNo}>
              <Input id="p-invoice" value={v.invoiceNo} onChange={(e) => set({ invoiceNo: e.target.value })} />
            </Field>
          </div>
          <SwitchField label="Amount includes GST" checked={v.gstIncluded} onCheckedChange={(gstIncluded) => set({ gstIncluded })} />
          <Field label="Notes" htmlFor="p-notes">
            <Textarea id="p-notes" rows={2} value={v.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}
