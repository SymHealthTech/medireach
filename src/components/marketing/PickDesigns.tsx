"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, IdCard, LayoutTemplate } from "lucide-react";
import { DesignPicker } from "@/components/intake/DesignPickers";
import { PICK_DESIGNS } from "@/content/marketing";
import type { IntakeKind } from "@/lib/constants";
import { DESIGN_OPTIONS, DESIGN_TYPE_FIELD, INTAKE_SECTIONS, type FieldDef } from "@/lib/intake/form";
import { WhatsAppIcon, WhatsAppLink } from "./WhatsAppLink";

const P = PICK_DESIGNS;

/** The website form's design field for this kind (same choices as the form). */
function websiteField(kind: IntakeKind): FieldDef {
  const fields = INTAKE_SECTIONS[kind].find((s) => s.key === "design")?.fields ?? [];
  return fields.find((f) => f.key === "websiteDesign") ?? { key: "websiteDesign", label: "websiteDesign", type: "design", kind };
}

const panel = "rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-6";
const heading = "flex items-center gap-2.5 font-display text-xl font-semibold text-ink sm:text-2xl";
const iconWrap = "flex size-9 shrink-0 items-center justify-center rounded-full bg-sage text-lagoon";

/**
 * "Pick your design": the audience's website designs with View (full screen)
 * and Select, the same picker as the website form. The digital visiting card
 * comes in the chosen design, so there is nothing else to pick. "Start my
 * form" opens the form with the design filled in (?design=…); the pick can
 * also go to us on WhatsApp. Used on the product pages and /designs.
 */
export function PickDesigns({
  kind,
  waNumber,
  type,
  placement,
}: {
  kind: IntakeKind;
  /** MediReach WhatsApp number (digits). */
  waNumber: string;
  /** Clinics/hospitals: the type the picker opens on. */
  type?: string;
  /** Analytics name of the WhatsApp button (defaults to the /designs one). */
  placement?: string;
}) {
  const [design, setDesign] = useState("");
  const designName = DESIGN_OPTIONS[kind].find((d) => d.value === design)?.label;

  const startHref = `/get-started/${kind}${design ? `?${new URLSearchParams({ design }).toString()}` : ""}`;
  const waText = P.whatsappTextDesign.replace("{what}", P.whatsappWhat[kind]).replace("{design}", designName ?? P.undecided);
  const waHref = `https://wa.me/${waNumber.replace(/\D/g, "")}?text=${encodeURIComponent(waText)}`;

  return (
    <div className="space-y-6">
      <div className={panel}>
        <div className="mb-5">
          <h3 className={heading}>
            <span className={iconWrap} aria-hidden>
              <LayoutTemplate className="size-[18px]" strokeWidth={2} />
            </span>
            {P.website[kind]}
          </h3>
          <p className="mt-1.5 text-body/80">{P.websiteText}</p>
        </div>
        <DesignPicker
          id={`pick-${kind}-design`}
          field={websiteField(kind)}
          value={design}
          onChange={setDesign}
          context={kind === "doctor" || !type ? undefined : { [DESIGN_TYPE_FIELD[kind]]: type }}
          undecided={false}
        />
        <p className="mt-5 flex items-start gap-2.5 rounded-xl bg-mint px-4 py-3 text-sm text-body">
          <IdCard aria-hidden className="mt-0.5 size-4 shrink-0 text-lagoon" strokeWidth={2} />
          <span>
            {P.cardText}{" "}
            <Link href="/visiting-cards" className="font-semibold text-lagoon underline-offset-2 hover:underline">
              {P.allCards}
            </Link>
          </span>
        </p>
      </div>

      <div className="rounded-2xl bg-ink p-5 text-paper shadow-soft sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div aria-live="polite">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-marigold">{P.yourPick}</p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-paper/90">
              <dt className="text-paper/60">{P.designLabel}</dt>
              <dd className="font-semibold">{designName ?? <span className="font-normal text-paper/60">{P.notPicked}</span>}</dd>
            </dl>
            {!design && <p className="mt-3 text-sm text-paper/70">{P.note}</p>}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
            <Link
              href={startHref}
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-marigold px-6 font-semibold text-white transition-colors hover:bg-marigold-700 active:scale-[.98]"
            >
              {design ? P.startDesign : P.startEmpty}
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
            </Link>
            <WhatsAppLink
              href={waHref}
              placement={placement ?? `designs_${kind}_picks`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] border border-paper/25 px-6 font-semibold text-paper transition-colors hover:bg-paper/10 active:scale-[.98]"
            >
              <WhatsAppIcon className="size-5" /> {P.whatsappDesign}
            </WhatsAppLink>
          </div>
        </div>
      </div>
    </div>
  );
}
