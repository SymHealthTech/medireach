"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { ArrowRight, Check } from "lucide-react";
import { HOME_DESIGNS } from "@/content/marketing";
import { cn } from "@/lib/cn";
import { THEME_ICONS } from "@/themes/icons";
import { LaptopFrame, PhoneFrame } from "./Frames";
import { MiniSiteLaptop, MiniSitePhone, type MiniSiteData } from "./MiniSite";

/**
 * "Designs made for your specialty" (DESIGN_BRIEF.md §4.6): a chip per
 * specialty; picking one crossfades a laptop + phone preview of that design's
 * fictional sample, its "built for this specialty" points (plus doctor
 * profiles) and a "View sample" link. `#design-<key>` links (the specialty marquee) pick a chip.
 */
export function DesignShowcase({ sites }: { sites: MiniSiteData[] }) {
  const [key, setKey] = useState(sites[0]!.themeKey);

  useEffect(() => {
    const fromHash = () => {
      const k = window.location.hash.replace(/^#design-/, "");
      if (k !== window.location.hash && sites.some((s) => s.themeKey === k)) {
        setKey(k);
        document.getElementById("designs")?.scrollIntoView({ block: "start" });
      }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [sites]);

  const s = sites.find((x) => x.themeKey === key) ?? sites[0]!;

  return (
    <div className="space-y-7">
      <div role="radiogroup" aria-label={HOME_DESIGNS.filterLabel} className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0">
        {sites.map((x) => {
          const Icon = THEME_ICONS[x.icon];
          const active = x.themeKey === key;
          return (
            <button
              key={x.themeKey}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setKey(x.themeKey)}
              className={cn(
                "inline-flex h-10 shrink-0 snap-start items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
                active ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink hover:border-ink/40",
              )}
            >
              <Icon className="size-4" strokeWidth={1.75} />
              {x.themeName}
            </button>
          );
        })}
      </div>

      <div className="mx-auto grid max-w-[980px] items-center gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-12">
        <div className="relative mx-auto w-full max-w-[520px] [display:grid] [grid-template-areas:'stage']">
          <AnimatePresence initial={false}>
            <m.div
              key={s.themeKey}
              className="relative pb-8 pr-10 [grid-area:stage] sm:pr-14"
              initial={{ opacity: 0, x: 12, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -12, scale: 0.98 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <LaptopFrame url={`${s.name.toLowerCase().replace(/[^a-z]+/g, "")}.medireach.co.in`} badge={HOME_DESIGNS.badge}>
                <MiniSiteLaptop site={s} />
              </LaptopFrame>
              <div className="absolute bottom-0 right-0">
                <PhoneFrame scale={0.4}>
                  <MiniSitePhone site={s} />
                </PhoneFrame>
              </div>
            </m.div>
          </AnimatePresence>
        </div>

        <div aria-live="polite">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-lagoon">{HOME_DESIGNS.builtFor}</h3>
          <ul className="mt-4 space-y-3">
            {[...s.points, HOME_DESIGNS.doctors].map((p) => (
              <li key={p} className="flex gap-3 text-body">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-leaf/15 text-leaf-text">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                {p}
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={s.href}
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-ink px-6 font-semibold text-paper transition-colors hover:bg-ink-700 active:scale-[.98]"
            >
              {HOME_DESIGNS.view}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
            </Link>
            <Link href={`/designs?for=${s.kind}&design=${s.themeKey}`} className="inline-flex min-h-12 items-center px-2 font-semibold text-lagoon hover:text-ink">
              {HOME_DESIGNS.all}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
