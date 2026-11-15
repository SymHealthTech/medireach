"use client";

import { useState } from "react";
import { Clock, Eye, Pencil, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/admin/form/fields";
import { FormDialog, useActionRunner } from "@/components/admin/FormDialog";
import { Pill } from "@/components/admin/StatusBadge";
import { SimpleImageUpload } from "@/components/admin/doctor-editor/PhotoCropUpload";
import { TEMPLATE_STATUSES, type TemplateKey, type TemplateStatus, type TemplateType } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { setDefaultTemplateAction, updateTemplateSlotAction } from "./actions";

const STATUS_LABEL: Record<TemplateStatus, string> = { coming_soon: "Coming soon", in_design: "In design", ready: "Ready" };
const STATUS_TONE = { coming_soon: "muted", in_design: "marigold", ready: "leaf" } as const;

export interface SlotView {
  type: TemplateType;
  key: TemplateKey;
  name: string;
  status: TemplateStatus;
  isDefault: boolean;
  preview?: { publicId: string; url: string };
  doctorsUsing: number;
  previewHref?: string;
}

export function TemplateSlotCard({ slot }: { slot: SlotView }) {
  const { run, pending } = useActionRunner();
  const [name, setName] = useState(slot.name);
  const [status, setStatus] = useState(slot.status);
  const [preview, setPreview] = useState(slot.preview);
  const ready = slot.status === "ready";

  return (
    <article className={cn("flex flex-col overflow-hidden rounded-xl border bg-card shadow-soft", ready ? "border-line" : "border-dashed border-line")}>
      <div className="relative flex aspect-[4/5] items-center justify-center bg-sage">
        {slot.preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
          <img src={slot.preview.url} alt={`${slot.name} preview`} className="size-full object-cover" />
        ) : ready ? (
          <span className="font-display text-4xl text-ink">Aa</span>
        ) : (
          <svg aria-hidden viewBox="0 0 120 150" className="w-2/3 text-ink/25">
            <rect x="10" y="10" width="100" height="130" rx="10" fill="none" stroke="currentColor" strokeDasharray="5 6" strokeWidth="2" />
            <circle cx="60" cy="45" r="14" fill="currentColor" />
            <rect x="30" y="70" width="60" height="8" rx="4" fill="currentColor" />
            <rect x="38" y="86" width="44" height="6" rx="3" fill="currentColor" />
            <rect x="24" y="104" width="72" height="20" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        )}
        {slot.isDefault && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-on-ink">
            <Star className="size-3 fill-current" /> Default
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-ink">{slot.name}</p>
          <Pill tone={STATUS_TONE[slot.status]}>{STATUS_LABEL[slot.status]}</Pill>
        </div>
        <p className="text-xs text-muted-foreground">
          {slot.key === "classic" ? "Slot 1" : `Slot ${slot.key.slice(1)}`} · {slot.doctorsUsing} doctor{slot.doctorsUsing === 1 ? "" : "s"}
        </p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
          {slot.previewHref && (
            <Button asChild size="sm" variant="outline">
              <a href={slot.previewHref} target="_blank" rel="noopener">
                <Eye /> Preview
              </a>
            </Button>
          )}
          <FormDialog
            trigger={
              <Button size="sm" variant="ghost" aria-label={`Edit ${slot.name}`}>
                <Pencil />
              </Button>
            }
            title={`Edit “${slot.name}”`}
            description="Only ready designs can be chosen for doctors. Others fall back to Classic."
            successMessage="Design updated"
            onSubmit={() => updateTemplateSlotAction({ type: slot.type, key: slot.key, name, status, previewImage: preview ?? null })}
          >
            {(errors) => (
              <>
                <Field label="Name" htmlFor={`t-name-${slot.type}-${slot.key}`} error={errors.name}>
                  <Input id={`t-name-${slot.type}-${slot.key}`} value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="Status" htmlFor={`t-status-${slot.type}-${slot.key}`}>
                  <NativeSelect id={`t-status-${slot.type}-${slot.key}`} value={status} onChange={(e) => setStatus(e.target.value as TemplateStatus)}>
                    {TEMPLATE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Preview image" htmlFor="">
                  <SimpleImageUpload purpose="template-preview" value={preview} onChange={(v) => setPreview(v)} label="Upload preview" />
                </Field>
              </>
            )}
          </FormDialog>
          {ready && !slot.isDefault && (
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setDefaultTemplateAction({ type: slot.type, key: slot.key }), "Default updated")}>
              <Star /> Set default
            </Button>
          )}
          {!ready && <Clock className="ml-auto size-4 self-center text-muted-foreground" aria-label="Not ready" />}
        </div>
      </div>
    </article>
  );
}
