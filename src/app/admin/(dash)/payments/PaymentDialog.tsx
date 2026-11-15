"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect, NumberInput, SwitchField } from "@/components/admin/form/fields";
import { FormDialog } from "@/components/admin/FormDialog";
import { PAYMENT_MODE_LABEL, PAYMENT_PURPOSE_LABEL } from "@/lib/admin/labels";
import { PAYMENT_MODES, PAYMENT_PURPOSES } from "@/lib/constants";
import { toDateInput } from "@/lib/format";
import { recordPaymentAction } from "./actions";

export function PaymentDialog({
  doctors,
  hospitals,
  defaultDoctorId,
  gstIncludedDefault,
}: {
  doctors: { id: string; name: string }[];
  hospitals: { id: string; name: string }[];
  defaultDoctorId?: string;
  gstIncludedDefault: boolean;
}) {
  const blank = () => ({
    doctorId: defaultDoctorId ?? "",
    hospitalId: "",
    amount: undefined as number | undefined,
    gstIncluded: gstIncludedDefault,
    mode: "upi" as (typeof PAYMENT_MODES)[number],
    date: toDateInput(new Date()),
    purpose: "setup" as (typeof PAYMENT_PURPOSES)[number],
    invoiceNo: "",
    notes: "",
  });
  const [v, setV] = useState(blank);
  const set = (patch: Partial<ReturnType<typeof blank>>) => setV((x) => ({ ...x, ...patch }));

  return (
    <FormDialog
      trigger={
        <Button>
          <Plus /> Record payment
        </Button>
      }
      title="Record payment"
      submitLabel="Record"
      successMessage="Payment recorded"
      onSubmit={() => recordPaymentAction({ ...v, amount: v.amount ?? 0 })}
      onSuccess={() => setV(blank())}
    >
      {(errors) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Doctor" htmlFor="p-doctor" error={errors.doctorId}>
              <NativeSelect id="p-doctor" value={v.doctorId} onChange={(e) => set({ doctorId: e.target.value })}>
                <option value="">—</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="or Hospital" htmlFor="p-hospital">
              <NativeSelect id="p-hospital" value={v.hospitalId} onChange={(e) => set({ hospitalId: e.target.value })}>
                <option value="">—</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
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
            <Field label="Purpose" htmlFor="p-purpose">
              <NativeSelect id="p-purpose" value={v.purpose} onChange={(e) => set({ purpose: e.target.value as typeof v.purpose })}>
                {PAYMENT_PURPOSES.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_PURPOSE_LABEL[m]}
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
