"use client";

import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, NativeSelect, NumberInput, SwitchField } from "@/components/admin/form/fields";
import { Pill } from "@/components/admin/StatusBadge";
import { DOCTOR_PLAN_LABEL, RENEWAL_STATUS_LABEL, RENEWAL_STATUS_TONE } from "@/lib/admin/labels";
import { DOCTOR_PLANS, DOCTOR_SOURCES, DOMAIN_STATUSES } from "@/lib/constants";
import { Group, grid2, type StepProps } from "../shared";

const SOURCE_LABEL: Record<(typeof DOCTOR_SOURCES)[number], string> = {
  field: "Field visit",
  referral: "Referral",
  hospital: "Clinic / hospital",
  inbound: "Inbound (website / WhatsApp)",
};

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function BusinessStep({ form: f, set, err, options, readOnly, role, doctorId }: StepProps) {
  const isAdmin = role !== "sales";
  const linked = new Set(f.establishmentIds);
  const clinicLinked = new Set(f.clinics.map((c) => c.establishmentId).filter(Boolean));
  const listPrice = (founding: boolean) => (founding ? options.prices.foundingRenewal : options.prices.renewalDoctor);

  return (
    <div className="space-y-5">
      <Group title="Plan and source" description="Internal. Never shown on the public page.">
        <div className={grid2}>
          <Field label="Plan" htmlFor="plan" help="Add-on: bought with a clinic or hospital website, at the add-on setup price.">
            <NativeSelect id="plan" value={f.plan} disabled={readOnly} onChange={(e) => set({ plan: e.target.value as typeof f.plan })}>
              {DOCTOR_PLANS.map((p) => (
                <option key={p} value={p}>
                  {DOCTOR_PLAN_LABEL[p]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Source" htmlFor="source">
            <NativeSelect id="source" value={f.source} disabled={readOnly} onChange={(e) => set({ source: e.target.value as typeof f.source })}>
              <option value="" />
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
        </div>
      </Group>

      <Group title="Clinics and hospitals" description="Sites on MediReach this doctor belongs to. Clinics linked in the Clinics step are included automatically.">
        {options.establishments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No clinic or hospital sites yet.</p>
        ) : (
          <ul className="grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2">
            {options.establishments.map((e) => (
              <li key={e.id}>
                <label className="flex min-h-10 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent">
                  <Checkbox
                    checked={linked.has(e.id) || clinicLinked.has(e.id)}
                    disabled={readOnly || clinicLinked.has(e.id)}
                    onCheckedChange={(on) =>
                      set((f) => ({ establishmentIds: on ? [...f.establishmentIds, e.id] : f.establishmentIds.filter((x) => x !== e.id) }))
                    }
                  />
                  {e.name}
                  <span className="text-xs text-muted-foreground">{e.kind === "hospital" ? "Hospital" : "Clinic"}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {err("establishmentIds") && <p className="text-sm text-clay-text">{err("establishmentIds")}</p>}
      </Group>

      <Group title="Setup and renewal" description={isAdmin ? "Setup is paid once; the renewal is yearly from year 2." : "Only an admin can change these."}>
        <div className={grid2}>
          <Field label="Setup paid on" htmlFor="setupPaidAt" error={err("setupPaidAt")} help="Usually set by recording the setup payment.">
            <Input id="setupPaidAt" type="date" value={f.setupPaidAt} disabled={readOnly || !isAdmin} onChange={(e) => set({ setupPaidAt: e.target.value })} />
          </Field>
          <Field label="Renewal price per year (₹)" htmlFor="renewalPrice" help={`Leave empty for ${rupees(listPrice(f.founding))} from Settings.`}>
            <NumberInput id="renewalPrice" value={f.renewalPrice} disabled={readOnly || !isAdmin} onChange={(renewalPrice) => set({ renewalPrice })} />
          </Field>
          <Field label="Renewal due on" htmlFor="renewalDueDate" error={err("renewalDueDate")} help="Leave empty for one year after the setup date.">
            <Input id="renewalDueDate" type="date" value={f.renewalDueDate} disabled={readOnly || !isAdmin} onChange={(e) => set({ renewalDueDate: e.target.value })} />
          </Field>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Renewal status</p>
            <div className="flex min-h-11 items-center">
              <Pill tone={RENEWAL_STATUS_TONE[f.renewalStatus]}>{RENEWAL_STATUS_LABEL[f.renewalStatus]}</Pill>
            </div>
            <p className="text-xs text-muted-foreground">Worked out from the due date when you save.</p>
          </div>
        </div>
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
            <Input id="ownDomain.name" placeholder="drshah.in" value={f.ownDomain.name} disabled={readOnly || !isAdmin} onChange={(e) => set((f) => ({ ownDomain: { ...f.ownDomain, name: e.target.value } }))} />
          </Field>
          <Field label="Status" htmlFor="ownDomain.status">
            <NativeSelect
              id="ownDomain.status"
              value={f.ownDomain.status}
              disabled={readOnly || !isAdmin}
              onChange={(e) => set((f) => ({ ownDomain: { ...f.ownDomain, status: e.target.value as typeof f.ownDomain.status } }))}
            >
              {DOMAIN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s[0]!.toUpperCase() + s.slice(1)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Cost (₹)" htmlFor="ownDomain.cost">
            <NumberInput id="ownDomain.cost" value={f.ownDomain.cost} disabled={readOnly || !isAdmin} onChange={(cost) => set((f) => ({ ownDomain: { ...f.ownDomain, cost } }))} />
          </Field>
          <Field label="Renewal date" htmlFor="ownDomain.renewalDate">
            <Input id="ownDomain.renewalDate" type="date" value={f.ownDomain.renewalDate} disabled={readOnly || !isAdmin} onChange={(e) => set((f) => ({ ownDomain: { ...f.ownDomain, renewalDate: e.target.value } }))} />
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
