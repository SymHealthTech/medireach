"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { ArrowRight, Check, Pause, Play } from "lucide-react";
import { WhatsAppIcon, WhatsAppLink } from "@/components/marketing/WhatsAppLink";
import { HERO, type Audience } from "@/content/marketing";
import { cn } from "@/lib/cn";
import { LoopGuard } from "./LoopGuard";

const AUDIENCES: Audience[] = ["doctor", "clinic", "hospital"];
/** `#clinic` (and the older `#for-clinic`) open on that slide. */
const HASH: Record<string, Audience> = {
  "#doctor": "doctor",
  "#clinic": "clinic",
  "#hospital": "hospital",
  "#for-doctor": "doctor",
  "#for-clinic": "clinic",
  "#for-hospital": "hospital",
};

/**
 * Hero carousel (DESIGN_BRIEF.md §4.2): three slides (Doctor · Clinic ·
 * Hospital), each with its own tagline, one line, price and device.
 *
 * Auto-advance is driven by the active tab's progress bar (a CSS animation;
 * its `animationend` moves to the next slide), so it pauses for free on hover,
 * keyboard focus, the pause button and off-screen (LoopGuard). With reduced
 * motion there is no auto-advance. Picking a slide writes its hash so sales
 * links (`/#clinic`) open on the right one.
 */
export function HeroAudience({
  heading,
  prices,
  stages,
  waHref,
}: {
  heading: ReactNode;
  prices: Record<Audience, string>;
  stages: Record<Audience, ReactNode>;
  waHref: string;
}) {
  const [audience, setAudience] = useState<Audience>("doctor");
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const [autoplay, setAutoplay] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAutoplay(!reduce.matches);
    sync();
    reduce.addEventListener("change", sync);

    const fromHash = () => {
      const a = HASH[window.location.hash];
      if (a) setAudience(a);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => {
      reduce.removeEventListener("change", sync);
      window.removeEventListener("hashchange", fromHash);
    };
  }, []);

  function choose(a: Audience) {
    setAudience(a);
    // Same route, so Next keeps this page instance; pass the router state through.
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#${a}`);
  }

  const next = () => setAudience((a) => AUDIENCES[(AUDIENCES.indexOf(a) + 1) % AUDIENCES.length]!);
  const copy = HERO.audiences[audience];
  const running = autoplay && !paused;

  return (
    <LoopGuard className="mx-auto grid max-w-content items-center gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
      <div
        className="space-y-6"
        aria-roledescription="carousel"
        aria-label={HERO.carouselLabel}
        onMouseEnter={() => setHeld(true)}
        onMouseLeave={() => setHeld(false)}
        onFocus={() => setHeld(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false);
        }}
      >
        {heading}

        <div className="mr-enter flex items-center gap-3" style={{ "--d": "60ms" } as React.CSSProperties}>
          <div role="tablist" aria-label={HERO.carouselLabel} className="inline-flex gap-1 rounded-full bg-surface p-1 shadow-soft ring-1 ring-line">
            {AUDIENCES.map((a) => {
              const active = audience === a;
              return (
                <button
                  key={a}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls="hero-slide"
                  onClick={() => choose(a)}
                  className={cn(
                    "relative h-9 overflow-hidden rounded-full px-4 text-sm font-semibold transition-colors duration-200",
                    active ? "bg-ink text-paper" : "text-ink/75 hover:bg-mint hover:text-ink",
                  )}
                >
                  {HERO.audiences[a].label}
                  {active && running && (
                    <span
                      key={a}
                      aria-hidden
                      onAnimationEnd={next}
                      className="mr-progress absolute inset-x-0 bottom-0 h-[3px] origin-left bg-marigold"
                      style={{ animationPlayState: held ? "paused" : undefined }}
                    />
                  )}
                </button>
              );
            })}
          </div>
          {autoplay && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? HERO.play : HERO.pause}
              className="flex size-10 items-center justify-center rounded-full text-ink/70 transition-colors hover:bg-surface hover:text-ink"
            >
              {paused ? <Play className="size-4" strokeWidth={2} /> : <Pause className="size-4" strokeWidth={2} />}
            </button>
          )}
        </div>

        <div
          id="hero-slide"
          role="tabpanel"
          aria-roledescription="slide"
          aria-label={`${AUDIENCES.indexOf(audience) + 1} / ${AUDIENCES.length}: ${copy.label}`}
          aria-live={running ? "off" : "polite"}
          className="mr-enter min-h-[168px] sm:min-h-[150px]"
          style={{ "--d": "120ms" } as React.CSSProperties}
        >
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={audience}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <p className="text-balance font-display text-[36px] font-semibold leading-[1.08] tracking-[-0.025em] text-ink sm:text-[46px] lg:text-[56px]">
                {copy.tagline}
              </p>
              <p className="mt-3 max-w-lg text-lg text-body/85">{copy.sub}</p>
              <p className="mt-4 inline-flex rounded-full bg-sage px-3 py-1 text-sm font-semibold text-ink-700">{prices[audience]}</p>
            </m.div>
          </AnimatePresence>
        </div>

        <div id="hero-cta" className="mr-enter flex flex-col gap-3 sm:flex-row" style={{ "--d": "180ms" } as React.CSSProperties}>
          <WhatsAppLink
            href={waHref}
            placement={`hero_${audience}`}
            className="inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] bg-marigold px-6 font-semibold text-white shadow-[0_10px_24px_-10px_rgba(218,138,67,.8)] transition-colors hover:bg-marigold-700 active:scale-[.98]"
          >
            <WhatsAppIcon className="size-5" /> {HERO.primaryCta}
          </WhatsAppLink>
          <Link
            href={`/designs?for=${audience}`}
            className="group inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border border-line bg-surface px-6 font-semibold text-ink transition-colors hover:border-ink/40 active:scale-[.98]"
          >
            {HERO.secondaryCta}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
          </Link>
        </div>

        <ul className="mr-enter flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-body/80" style={{ "--d": "240ms" } as React.CSSProperties}>
          {HERO.trust.map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <span className="flex size-4 items-center justify-center rounded-full bg-leaf/15">
                <Check aria-hidden className="size-3 text-leaf-text" strokeWidth={3} />
              </span>
              {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="mr-enter [display:grid] [grid-template-areas:'stage']" style={{ "--d": "120ms" } as React.CSSProperties}>
        <AnimatePresence initial={false}>
          <m.div
            key={audience}
            className="[grid-area:stage]"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {stages[audience]}
          </m.div>
        </AnimatePresence>
      </div>
    </LoopGuard>
  );
}
