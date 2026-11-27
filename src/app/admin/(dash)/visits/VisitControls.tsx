"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/admin/form/fields";
import { ConfirmButton, FormDialog } from "@/components/admin/FormDialog";
import { INTAKE_KINDS, VISIT_OUTCOME_LABEL, VISIT_OUTCOMES, type IntakeKind, type VisitOutcome } from "@/lib/constants";
import { todayIST } from "@/lib/visits/days";
import { createVisitAction, deleteVisitAction, updateVisitAction } from "./actions";

export interface VisitValues {
  day: string;
  kind: IntakeKind;
  doctorName: string;
  clinicName: string;
  mobile: string;
  area: string;
  outcome: VisitOutcome;
  followUpOn: string;
  notes: string;
}

const KIND_LABEL: Record<IntakeKind, string> = { doctor: "Doctor", clinic: "Clinic", hospital: "Hospital" };
const blank = (): VisitValues => ({ day: todayIST(), kind: "doctor", doctorName: "", clinicName: "", mobile: "", area: "", outcome: "positive", followUpOn: "", notes: "" });
const grid2 = "grid gap-4 sm:grid-cols-2";

function VisitForm({ v, set, errors, id }: { v: VisitValues; set: (patch: Partial<VisitValues>) => void; errors: Record<string, string>; id: string }) {
  const followUp = v.outcome === "follow_up" || v.outcome === "will_fill_form" || v.outcome === "positive";
  return (
    <>
      <div className={grid2}>
        <Field label="Date" htmlFor={`${id}-day`} required error={errors.day}>
          <Input id={`${id}-day`} type="date" value={v.day} max={todayIST()} onChange={(e) => set({ day: e.target.value })} />
        </Field>
        <Field label="Visited" htmlFor={`${id}-kind`}>
          <NativeSelect id={`${id}-kind`} value={v.kind} onChange={(e) => set({ kind: e.target.value as IntakeKind })}>
            {INTAKE_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="space-y-4 rounded-lg border border-line bg-muted/40 p-3">
        <p className="text-xs text-muted-foreground">
          Fill all three when you can: when they send the website form, it is matched to this visit on any of them, and joins your work.
        </p>
        <Field label="Doctor's name" htmlFor={`${id}-doctor`} error={errors.doctorName}>
          <Input id={`${id}-doctor`} value={v.doctorName} placeholder="Dr. Amit Kulkarni" onChange={(e) => set({ doctorName: e.target.value })} />
        </Field>
        <Field label={v.kind === "hospital" ? "Hospital name" : "Clinic name"} htmlFor={`${id}-clinic`} error={errors.clinicName}>
          <Input id={`${id}-clinic`} value={v.clinicName} placeholder={v.kind === "hospital" ? "Sai Hospital" : "Shah Skin Clinic"} onChange={(e) => set({ clinicName: e.target.value })} />
        </Field>
        <Field label="Mobile number" htmlFor={`${id}-mobile`} error={errors.mobile}>
          <Input id={`${id}-mobile`} type="tel" inputMode="numeric" value={v.mobile} placeholder="98765 43210" onChange={(e) => set({ mobile: e.target.value })} />
        </Field>
      </div>
      <Field label="Area" htmlFor={`${id}-area`} error={errors.area}>
        <Input id={`${id}-area`} value={v.area} placeholder="Kothrud" onChange={(e) => set({ area: e.target.value })} />
      </Field>
      <div className={grid2}>
        <Field label="Reply" htmlFor={`${id}-outcome`} required>
          <NativeSelect id={`${id}-outcome`} value={v.outcome} onChange={(e) => set({ outcome: e.target.value as VisitOutcome })}>
            {VISIT_OUTCOMES.map((o) => (
              <option key={o} value={o}>
                {VISIT_OUTCOME_LABEL[o]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {followUp && (
          <Field label="Follow up on (optional)" htmlFor={`${id}-follow`} error={errors.followUpOn}>
            <Input id={`${id}-follow`} type="date" min={v.day} value={v.followUpOn} onChange={(e) => set({ followUpOn: e.target.value })} />
          </Field>
        )}
      </div>
      <Field label="Notes" htmlFor={`${id}-notes`} error={errors.notes}>
        <Textarea id={`${id}-notes`} rows={3} value={v.notes} placeholder="What they said, best time to call…" onChange={(e) => set({ notes: e.target.value })} />
      </Field>
    </>
  );
}

const payload = (v: VisitValues) => ({ ...v, followUpOn: v.outcome === "not_interested" || v.outcome === "not_available" ? "" : v.followUpOn });

/** "Log a visit": the sales executive's daily work list. */
export function LogVisitButton({ label = "Log a visit" }: { label?: string }) {
  const [v, setV] = useState<VisitValues>(blank);
  return (
    <FormDialog
      trigger={
        <Button>
          <Plus /> {label}
        </Button>
      }
      title="Log a visit"
      description="Whom you met today and what they said."
      submitLabel="Save visit"
      successMessage="Visit saved"
      onSubmit={() => createVisitAction(payload(v))}
      onSuccess={(d) => {
        if (d.formFilled) toast.success("They have already sent the website form: it is now linked to you.");
        setV({ ...blank(), day: v.day });
      }}
    >
      {(errors) => <VisitForm v={v} set={(p) => setV((x) => ({ ...x, ...p }))} errors={errors} id="new-visit" />}
    </FormDialog>
  );
}

/** Edit / delete one visit. */
export function VisitActions({ id, initial, name }: { id: string; initial: VisitValues; name: string }) {
  const [v, setV] = useState<VisitValues>(initial);
  return (
    <div className="flex shrink-0 gap-0.5">
      <FormDialog
        trigger={
          <Button size="icon-sm" variant="ghost" aria-label={`Edit visit to ${name}`}>
            <Pencil />
          </Button>
        }
        title="Edit visit"
        submitLabel="Save"
        successMessage="Visit updated"
        onSubmit={() => updateVisitAction({ id, data: payload(v) })}
      >
        {(errors) => <VisitForm v={v} set={(p) => setV((x) => ({ ...x, ...p }))} errors={errors} id={`visit-${id}`} />}
      </FormDialog>
      <ConfirmButton
        trigger={
          <Button size="icon-sm" variant="ghost" className="text-clay-text" aria-label={`Delete visit to ${name}`}>
            <Trash2 />
          </Button>
        }
        title="Delete this visit?"
        description={`The visit to ${name} is removed from the work list.`}
        confirmLabel="Delete"
        successMessage="Visit deleted"
        onConfirm={() => deleteVisitAction({ id })}
      />
    </div>
  );
}
