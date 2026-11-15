"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Pencil, Phone, Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/admin/form/fields";
import { FormDialog, useActionRunner } from "@/components/admin/FormDialog";
import { LEAD_SOURCES, LEAD_STATUSES } from "@/lib/constants";
import { LEAD_SOURCE_LABEL, LEAD_STATUS_LABEL } from "@/lib/admin/labels";
import { createLeadAction, setLeadStatusAction, updateLeadAction } from "./actions";

export interface LeadRow {
  id: string;
  name: string;
  phone: string;
  city?: string;
  specialty?: string;
  message?: string;
  source: (typeof LEAD_SOURCES)[number];
  status: (typeof LEAD_STATUSES)[number];
}

function LeadForm({ value, onChange, errors }: { value: Omit<LeadRow, "id" | "status">; onChange: (v: Omit<LeadRow, "id" | "status">) => void; errors: Record<string, string> }) {
  return (
    <>
      <Field label="Name" htmlFor="lead-name" required error={errors.name}>
        <Input id="lead-name" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
      </Field>
      <Field label="Phone" htmlFor="lead-phone" required error={errors.phone}>
        <Input id="lead-phone" type="tel" inputMode="tel" value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City" htmlFor="lead-city">
          <Input id="lead-city" value={value.city ?? ""} onChange={(e) => onChange({ ...value, city: e.target.value })} />
        </Field>
        <Field label="Specialty" htmlFor="lead-specialty">
          <Input id="lead-specialty" value={value.specialty ?? ""} onChange={(e) => onChange({ ...value, specialty: e.target.value })} />
        </Field>
      </div>
      <Field label="Source" htmlFor="lead-source">
        <NativeSelect id="lead-source" value={value.source} onChange={(e) => onChange({ ...value, source: e.target.value as LeadRow["source"] })}>
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>
              {LEAD_SOURCE_LABEL[s]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Notes / message" htmlFor="lead-message">
        <Textarea id="lead-message" rows={3} value={value.message ?? ""} onChange={(e) => onChange({ ...value, message: e.target.value })} />
      </Field>
    </>
  );
}

export function NewLeadButton() {
  const blank = { name: "", phone: "", city: "Pune", specialty: "", message: "", source: "homepage_form" as const };
  const [v, setV] = useState<Omit<LeadRow, "id" | "status">>(blank);
  return (
    <FormDialog
      trigger={
        <Button>
          <Plus /> New lead
        </Button>
      }
      title="New lead"
      submitLabel="Add lead"
      successMessage="Lead added"
      onSubmit={() => createLeadAction({ ...v, city: v.city ?? "", specialty: v.specialty ?? "", message: v.message ?? "" })}
      onSuccess={() => setV(blank)}
    >
      {(errors) => <LeadForm value={v} onChange={setV} errors={errors} />}
    </FormDialog>
  );
}

export function LeadActions({ lead, waText }: { lead: LeadRow; waText: string }) {
  const { run, pending } = useActionRunner();
  const [v, setV] = useState<Omit<LeadRow, "id" | "status">>(lead);
  const digits = lead.phone.replace(/\D/g, "");
  const wa = digits.length === 10 ? `91${digits}` : digits;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <NativeSelect
        aria-label="Status"
        className="h-9 w-auto"
        value={lead.status}
        disabled={pending}
        onChange={(e) => run(() => setLeadStatusAction({ id: lead.id, status: e.target.value as LeadRow["status"] }), "Status updated")}
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {LEAD_STATUS_LABEL[s]}
          </option>
        ))}
      </NativeSelect>
      <Button asChild size="icon-sm" variant="outline" aria-label={`Call ${lead.name}`}>
        <a href={`tel:+${wa}`}>
          <Phone />
        </a>
      </Button>
      <Button asChild size="icon-sm" variant="outline" aria-label={`WhatsApp ${lead.name}`}>
        <a href={`https://wa.me/${wa}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener">
          <MessageCircle />
        </a>
      </Button>
      <FormDialog
        trigger={
          <Button size="icon-sm" variant="outline" aria-label="Edit lead">
            <Pencil />
          </Button>
        }
        title="Edit lead"
        successMessage="Lead updated"
        onSubmit={() => updateLeadAction({ id: lead.id, ...v, city: v.city ?? "", specialty: v.specialty ?? "", message: v.message ?? "" })}
      >
        {(errors) => <LeadForm value={v} onChange={setV} errors={errors} />}
      </FormDialog>
      {lead.status !== "won" && lead.source !== "whatsapp_click" && (
        <Button asChild size="sm" variant="secondary">
          <Link href={`/admin/doctors/new?lead=${lead.id}`}>
            <UserPlus /> Convert to doctor
          </Link>
        </Button>
      )}
    </div>
  );
}
