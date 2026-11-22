"use client";

import Link from "next/link";
import { CreditCard, ExternalLink } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect } from "@/components/admin/form/fields";
import { SitePicker } from "@/components/admin/form/SitePicker";
import { DOCTOR_PLAN_LABEL } from "@/lib/admin/labels";
import { DOCTOR_PLANS } from "@/lib/constants";
import { Group, grid2, type StepProps } from "../shared";


export function BusinessStep({ form: f, set, err, options, readOnly, role, doctorId }: StepProps) {
  const isAdmin = role !== "sales";
  const clinicLinked = new Set(f.clinics.map((c) => c.establishmentId).filter(Boolean));

  return (
    <div className="space-y-5">
      <Group title="Plan" description="Internal. Never shown on the public page.">
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
        </div>
      </Group>

      <Group title="Clinics and hospitals" description="Search for the clinic or hospital sites on MediReach this doctor belongs to, and select them. Clinics linked in the Clinics step are included automatically.">
        {options.establishments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No clinic or hospital sites yet.</p>
        ) : (
          <SitePicker
            options={options.establishments}
            value={f.establishmentIds.filter((x) => !clinicLinked.has(x))}
            locked={[...clinicLinked]}
            disabled={readOnly}
            onChange={(ids) => set({ establishmentIds: ids })}
          />
        )}
        {err("establishmentIds") && <p className="text-sm text-clay-text">{err("establishmentIds")}</p>}
      </Group>

      <Group title="Notes and payments">
        <Field label="Internal notes" htmlFor="internalNotes">
          <Textarea id="internalNotes" rows={3} value={f.internalNotes} disabled={readOnly} onChange={(e) => set({ internalNotes: e.target.value })} />
        </Field>
        {isAdmin && doctorId && (
          <Button asChild variant="outline">
            {/* A new tab, so nothing typed here is lost. */}
            <Link href={`/admin/payments?doctor=${doctorId}`} target="_blank" rel="noopener">
              <CreditCard /> All payments for this doctor <ExternalLink className="size-3.5" aria-hidden />
            </Link>
          </Button>
        )}
        <p className="text-xs text-muted-foreground">The sales executive is on the Review step; payment, setup and renewal, and own domain are on the last step, Publish.</p>
      </Group>
    </div>
  );
}
