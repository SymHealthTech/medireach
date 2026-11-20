"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CreditCard, LayoutTemplate } from "lucide-react";
import { CardStylePicker, DesignPicker } from "@/components/intake/DesignPickers";
import type { CardFace } from "@/components/intake/IntakeContext";
import { PICK_DESIGNS } from "@/content/marketing";
import { CARD_STYLES_BY_GROUP } from "@/lib/cards/styles";
import type { IntakeKind } from "@/lib/constants";
import { DESIGN_OPTIONS, INTAKE_SECTIONS, type FieldDef } from "@/lib/intake/form";
import { WhatsAppIcon, WhatsAppLink } from "./WhatsAppLink";

const P = PICK_DESIGNS;

/** The website form's design fields for this kind (same choices as the form). */
function designFields(kind: IntakeKind): { website: FieldDef; card: FieldDef } {
  const fields = INTAKE_SECTIONS[kind].find((s) => s.key === "design")?.fields ?? [];
  const find = (key: string, type: FieldDef["type"]): FieldDef => fields.find((f) => f.key === key) ?? { key, label: key, type, kind };
  return { website: find("websiteDesign", "design"), card: find("cardStyle", "card") };
}

const panel = "rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-6";
const heading = "flex items-center gap-2.5 font-display text-xl font-semibold text-ink sm:text-2xl";
const iconWrap = "flex size-9 shrink-0 items-center justify-center rounded-full bg-sage text-lagoon";
const moreLink = "group inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-lagoon hover:text-ink";

/**
 * "Pick your designs" on a product page: the audience's website designs and
 * visiting cards with View (full screen) and Select, the same pickers as the
 * website form. "Start my form" opens the form with the picks filled in
 * (?design=…&card=…); the picks can also go to us on WhatsApp.
 */
export function PickDesigns({
  kind,
  cardFaces,
  waNumber,
  allHref,
}: {
  kind: IntakeKind;
  /** Sample visiting cards per style code (server-rendered). */
  cardFaces: Record<string, CardFace>;
  /** MediReach WhatsApp number (digits). */
  waNumber: string;
  /** The full design gallery, linked beside the website designs. */
  allHref?: string;
}) {
  const [design, setDesign] = useState("");
  const [card, setCard] = useState("");
  const fields = designFields(kind);

  const designName = DESIGN_OPTIONS[kind].find((d) => d.value === design)?.label;
  const cardStyle = CARD_STYLES_BY_GROUP[kind].find((c) => c.code === card);
  const cardName = cardStyle ? `${cardStyle.name} (${cardStyle.code})` : undefined;

  const query = new URLSearchParams({ ...(design && { design }), ...(card && { card }) }).toString();
  const startHref = `/get-started/${kind}${query ? `?${query}` : ""}`;
  const waText = P.whatsappText
    .replace("{what}", P.whatsappWhat[kind])
    .replace("{design}", designName ?? P.undecided)
    .replace("{card}", cardName ?? P.undecided);
  const waHref = `https://wa.me/${waNumber.replace(/\D/g, "")}?text=${encodeURIComponent(waText)}`;

  return (
    <div className="space-y-6">
      <div className={panel}>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <h3 className={heading}>
              <span className={iconWrap} aria-hidden>
                <LayoutTemplate className="size-[18px]" strokeWidth={2} />
              </span>
              {P.website[kind]}
            </h3>
            <p className="mt-1.5 text-body/80">{P.websiteText}</p>
          </div>
          {allHref && (
            <Link href={allHref} className={moreLink}>
              {P.allDesigns}
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
            </Link>
          )}
        </div>
        <DesignPicker id={`pick-${kind}-design`} field={fields.website} value={design} onChange={setDesign} undecided={false} />
      </div>

      <div className={panel}>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <h3 className={heading}>
              <span className={iconWrap} aria-hidden>
                <CreditCard className="size-[18px]" strokeWidth={2} />
              </span>
              {P.card}
            </h3>
            <p className="mt-1.5 text-body/80">{P.cardText}</p>
          </div>
          <Link href="/visiting-cards" className={moreLink}>
            {P.allCards}
            <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
          </Link>
        </div>
        <CardStylePicker id={`pick-${kind}-card`} field={fields.card} value={card} onChange={setCard} cardFaces={cardFaces} undecided={false} />
      </div>

      <div className="rounded-2xl bg-ink p-5 text-paper shadow-soft sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div aria-live="polite">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-marigold">{P.yourPicks}</p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-paper/90">
              <dt className="text-paper/60">{P.designLabel}</dt>
              <dd className="font-semibold">{designName ?? <span className="font-normal text-paper/60">{P.notPicked}</span>}</dd>
              <dt className="text-paper/60">{P.cardLabel}</dt>
              <dd className="font-semibold">{cardName ?? <span className="font-normal text-paper/60">{P.notPicked}</span>}</dd>
            </dl>
            {!(design && card) && <p className="mt-3 text-sm text-paper/70">{P.note}</p>}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
            <Link
              href={startHref}
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-marigold px-6 font-semibold text-white transition-colors hover:bg-marigold-700 active:scale-[.98]"
            >
              {design || card ? P.start : P.startEmpty}
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
            </Link>
            <WhatsAppLink
              href={waHref}
              placement={`for_${kind}s_picks`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] border border-paper/25 px-6 font-semibold text-paper transition-colors hover:bg-paper/10 active:scale-[.98]"
            >
              <WhatsAppIcon className="size-5" /> {P.whatsapp}
            </WhatsAppLink>
          </div>
        </div>
      </div>
    </div>
  );
}
