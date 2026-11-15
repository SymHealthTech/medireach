"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/admin/form/fields";
import { FormDialog, useActionRunner } from "@/components/admin/FormDialog";
import { UPDATE_REQUEST_STATUSES } from "@/lib/constants";
import { createUpdateRequestAction, moveUpdateRequestAction, setUpdateRequestPaidAction } from "./actions";

type Status = (typeof UPDATE_REQUEST_STATUSES)[number];

export function NewUpdateRequestButton({ doctors, defaultPrice }: { doctors: { id: string; name: string; freeAvailable: boolean }[]; defaultPrice: number }) {
  const [doctorId, setDoctorId] = useState("");
  const [description, setDescription] = useState("");
  const chosen = doctors.find((d) => d.id === doctorId);
  return (
    <FormDialog
      trigger={
        <Button>
          <Plus /> New request
        </Button>
      }
      title="New update request"
      submitLabel="Create"
      successMessage="Request created"
      onSubmit={() => createUpdateRequestAction({ doctorId, description })}
      onSuccess={(d) => {
        if (d.free) toast.info("This was the doctor's free update.");
        setDoctorId("");
        setDescription("");
      }}
    >
      {(errors) => (
        <>
          <Field
            label="Doctor"
            htmlFor="ur-doctor"
            required
            error={errors.doctorId}
            help={chosen ? (chosen.freeAvailable ? "First update — free." : `Charged ₹${defaultPrice}.`) : undefined}
          >
            <NativeSelect id="ur-doctor" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
              <option value="">Choose…</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="What needs changing?" htmlFor="ur-desc" required error={errors.description}>
            <Textarea id="ur-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}

export function UpdateRequestCardActions({ id, status, paid, price }: { id: string; status: Status; paid: boolean; price: number }) {
  const { run, pending } = useActionRunner();
  const i = UPDATE_REQUEST_STATUSES.indexOf(status);
  const prev = UPDATE_REQUEST_STATUSES[i - 1];
  const next = UPDATE_REQUEST_STATUSES[i + 1];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {prev && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => moveUpdateRequestAction({ id, status: prev }))} aria-label="Move back">
          <ArrowLeft />
        </Button>
      )}
      {next && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => moveUpdateRequestAction({ id, status: next }), next === "done" ? "Marked done" : "Moved")}>
          {next === "done" ? <Check /> : <ArrowRight />} {next === "done" ? "Done" : "Start"}
        </Button>
      )}
      {price > 0 && (
        <Button size="sm" variant={paid ? "secondary" : "outline"} disabled={pending} onClick={() => run(() => setUpdateRequestPaidAction({ id, paid: !paid }), paid ? "Marked unpaid" : "Marked paid")}>
          {paid ? "Paid ✓" : "Mark paid"}
        </Button>
      )}
    </div>
  );
}
