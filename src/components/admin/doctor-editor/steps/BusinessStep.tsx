"use client";

import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect, NumberInput, SwitchField } from "@/components/admin/form/fields";
import { FoundingBadge } from "@/components/admin/StatusBadge";
import { DOCTOR_SOURCES, DOMAIN_STATUSES, PLANS } from "@/lib/constants";
import { Group, grid2, type StepProps } from "../shared";

const PLAN_LABEL: Record<(typeof PLANS)[number], string> = { gp: "GP", consultant: "Consultant", hospital: "Hospital" };
const SOURCE_LABEL: Record<(typeof DOCTOR_SOURCES)[number], string> = {
  field: "Field visit",
  referral: "Referral",
  hospital: "Hospital",
  inbound: "Inbound (website / WhatsApp)",
};

export function BusinessStep({ form: f, set, err, options, readOnly, role, doctorId }: StepProps) {
  const isAdmin = role !== "sales";
  return (
    <div className="space-y-5">
      <Group title="Plan and source" description="Internal — never shown on the public page.">
        <div className={grid2}>
          <Field label="Plan" htmlFor="plan">
            <NativeSelect id="plan" value={f.plan} disabled={readOnly} onChange={(e) => set({ plan: e.target.value as typeof f.plan })}>
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {PLAN_LABEL[p]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Source" htmlFor="source">
            <NativeSelect id="source" value={f.source} disabled={readOnly} onChange={(e) => set({ source: e.target.value as typeof f.source })}>
              <option value="">Choose…</option>
              {DOCTOR_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABEL[s]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Sales executive" htmlFor="salesExecutive">
            <Input id="salesExecutive" value={f.salesExecutive} disabled={readOnly} onChange={(e) => set({ salesExecutive: e.target.value })} />
          </Field>
          <Field label="Hospital account" htmlFor="hospitalAccountId" help="For hospital bulk deals.">
            <NativeSelect id="hospitalAccountId" value={f.hospitalAccountId} disabled={readOnly} onChange={(e) => set({ hospitalAccountId: e.target.value })}>
              <option value="">None</option>
              {options.hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </Group>

      <Group title="Founding Doctor and hosting" description={isAdmin ? undefined : "Only an admin can change these."}>
        <SwitchField
          label="Founding Doctor"
          description="First 100 doctors: free hosting forever. A number is assigned automatically."
          checked={f.foundingDoctor}
          disabled={readOnly || !isAdmin}
          onCheckedChange={(foundingDoctor) => set({ foundingDoctor })}
        />
        {f.foundingDoctor && f.foundingNumber && <FoundingBadge number={f.foundingNumber} />}
        {!f.foundingDoctor && (
          <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
            <SwitchField label="Free hosting forever" checked={f.hostingForever} disabled={readOnly || !isAdmin} onCheckedChange={(hostingForever) => set({ hostingForever })} />
            {!f.hostingForever && (
              <Field label="Free hosting until" htmlFor="hostingFreeUntil" error={err("hostingFreeUntil")}>
                <Input id="hostingFreeUntil" type="date" value={f.hostingFreeUntil} disabled={readOnly || !isAdmin} onChange={(e) => set({ hostingFreeUntil: e.target.value })} />
              </Field>
            )}
          </div>
        )}
        <SwitchField
          label="Free update already used"
          description="The first done-for-you update is free."
          checked={f.freeUpdateUsed}
          disabled={readOnly}
          onCheckedChange={(freeUpdateUsed) => set({ freeUpdateUsed })}
        />
      </Group>

      <Group title="Own domain (optional)" description="Charged at actual cost. Hosting on own domains comes later; this records the request.">
        <div className={grid2}>
          <Field label="Domain" htmlFor="ownDomain.name" error={err("ownDomain.name")}>
            <Input id="ownDomain.name" placeholder="drshah.in" value={f.ownDomain.name} disabled={readOnly || !isAdmin} onChange={(e) => set({ ownDomain: { ...f.ownDomain, name: e.target.value } })} />
          </Field>
          <Field label="Status" htmlFor="ownDomain.status">
            <NativeSelect
              id="ownDomain.status"
              value={f.ownDomain.status}
              disabled={readOnly || !isAdmin}
              onChange={(e) => set({ ownDomain: { ...f.ownDomain, status: e.target.value as typeof f.ownDomain.status } })}
            >
              {DOMAIN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s[0]!.toUpperCase() + s.slice(1)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Cost (₹)" htmlFor="ownDomain.cost">
            <NumberInput id="ownDomain.cost" value={f.ownDomain.cost} disabled={readOnly || !isAdmin} onChange={(cost) => set({ ownDomain: { ...f.ownDomain, cost } })} />
          </Field>
          <Field label="Renewal date" htmlFor="ownDomain.renewalDate">
            <Input id="ownDomain.renewalDate" type="date" value={f.ownDomain.renewalDate} disabled={readOnly || !isAdmin} onChange={(e) => set({ ownDomain: { ...f.ownDomain, renewalDate: e.target.value } })} />
          </Field>
        </div>
      </Group>

      <Group title="Notes and payments">
        <Field label="Internal notes" htmlFor="internalNotes">
          <Textarea id="internalNotes" rows={3} value={f.internalNotes} disabled={readOnly} onChange={(e) => set({ internalNotes: e.target.value })} />
        </Field>
        {isAdmin && doctorId && (
          <Button asChild variant="outline">
            <Link href={`/admin/payments?doctor=${doctorId}`}>
              <CreditCard /> Payments for this doctor
            </Link>
          </Button>
        )}
      </Group>
    </div>
  );
}
