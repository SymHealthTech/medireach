"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { WhatsAppIcon, WhatsAppLink } from "@/components/marketing/WhatsAppLink";
import { HERO, type Audience } from "@/content/marketing";
import { cn } from "@/lib/cn";
import { LoopGuard } from "./LoopGuard";

const AUDIENCES: Audience[] = ["doctor", "clinic", "hospital"];
/** `#clinic` (and the older `#for-clinic`) pre-select a tab. */
const HASH: Record<string, Audience> = {
  "#doctor": "doctor",
  "#clinic": "clinic",
  "#hospital": "hospital",
  "#for-doctor": "doctor",
  "#for-clinic": "clinic",
  "#for-hospital": "hospital",
};

/**
 * Hero (DESIGN_BRIEF.md §4.2) below the static H1: audience switcher
 * (Doctor · Clinic · Hospital) that swaps the subline, price line and device
 * stage. The stages are rendered on the server and passed in; the swap is a
 * crossfade + 12 px slide + 0.98 → 1 scale (350 ms). The selected tab is
 * reflected in the URL hash (`#clinic`) so sales links open the right tab.
 */
export function HeroAudience({
  heading,
  prices,
  stages,
  card,
  waHref,
}: {
  heading: ReactNode;
  prices: Record<Audience, string>;
  stages: Record<Audience, ReactNode>;
  /** The visiting card that overlaps the device; identical on every tab, so it's rendered once (keeps the page payload small). */
  card: ReactNode;
  waHref: string;
}) {
  const [audience, setAudience] = useState<Audience>("doctor");

  useEffect(() => {
    const fromHash = () => {
      const a = HASH[window.location.hash];
      if (a) setAudience(a);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  function choose(a: Audience) {
    setAudience(a);
    // Same route, so Next keeps this page instance; pass the router state through.
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#${a}`);
  }

  const copy = HERO.audiences[audience];
  const index = AUDIENCES.indexOf(audience);

  return (
    <div className="mx-auto grid max-w-content items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
      <div className="space-y-6">
        {heading}

        <div className="mr-enter space-y-2" style={{ "--d": "60ms" } as React.CSSProperties}>
          <p id="audience-label" className="sr-only">
            {HERO.switcherLabel}
          </p>
          <div role="radiogroup" aria-labelledby="audience-label" className="relative grid w-full max-w-[360px] grid-cols-3 rounded-full border border-line bg-surface p-1 shadow-soft">
            <span
              aria-hidden
              className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-ink transition-transform duration-300 ease-out"
              style={{ transform: `translateX(${index * 100}%)` }}
            />
            {AUDIENCES.map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={audience === a}
                onClick={() => choose(a)}
                className={cn(
                  "relative z-10 h-10 rounded-full text-sm font-semibold transition-colors duration-200",
                  audience === a ? "text-paper" : "text-ink hover:text-ink-700",
                )}
              >
                {HERO.audiences[a].label}
              </button>
            ))}
          </div>
        </div>

        <div className="mr-enter min-h-[112px] sm:min-h-[104px]" style={{ "--d": "120ms" } as React.CSSProperties} aria-live="polite">
          <p className="max-w-xl text-lg leading-relaxed text-body/90 lg:text-xl">{copy.sub}</p>
          <p className="mt-2 font-semibold text-ink">{prices[audience]}</p>
        </div>

        <div id="hero-cta" className="mr-enter flex flex-col gap-3 sm:flex-row" style={{ "--d": "180ms" } as React.CSSProperties}>
          <WhatsAppLink
            href={waHref}
            placement={`hero_${audience}`}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-ink px-6 font-semibold text-paper shadow-[0_8px_20px_-8px_rgba(14,59,60,.6)] transition-colors hover:bg-ink-700 active:scale-[.98]"
          >
            <WhatsAppIcon className="size-5" /> {HERO.primaryCta}
          </WhatsAppLink>
          <Link
            href="/designs"
            className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] border border-ink/20 bg-surface px-6 font-semibold text-ink transition-colors hover:border-ink active:scale-[.98]"
          >
            {HERO.secondaryCta}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
          </Link>
        </div>

        <p className="mr-enter flex items-start gap-2 text-sm font-medium text-leaf-text" style={{ "--d": "240ms" } as React.CSSProperties}>
          <ShieldCheck className="mt-0.5 size-4 shrink-0" strokeWidth={2} /> {HERO.trust}
        </p>
      </div>

      <div className="mr-enter relative [display:grid] [grid-template-areas:'stage']" style={{ "--d": "120ms" } as React.CSSProperties}>
        <AnimatePresence initial={false}>
          <m.div
            key={audience}
            className="[grid-area:stage]"
            initial={{ opacity: 0, x: 12, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -12, scale: 0.98 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            {stages[audience]}
          </m.div>
        </AnimatePresence>
        {/* Same box as HeroStage, so the card sits where it always did. */}
        <div className="pointer-events-none absolute inset-0 flex justify-center [grid-area:stage]">
          <LoopGuard className="relative h-[440px] w-full max-w-[500px] sm:h-[520px]">
            <div className="absolute bottom-3 left-0 z-10 w-[190px] -rotate-6 sm:bottom-6 sm:w-[240px]">{card}</div>
          </LoopGuard>
        </div>
      </div>
    </div>
  );
}
