"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { StockPhoto } from "@/templates/shared/specialty-photos";

/**
 * Full-bleed hero background carousel shared by designs 4 and 5. The look of
 * each change comes from the slide class in globals.css:
 *  - "wh": Warm Heritage, the new photo opens in a widening circle;
 *  - "sp": Specialist Pro, the new photo comes into focus from a blur.
 * Small controls sit bottom-right. Still for reduced-motion visitors and
 * hidden tabs; only the first photo loads eagerly.
 */
export function BgSlides({ slides, variant, interval = 6500 }: { slides: StockPhoto[]; variant: "wh" | "sp"; interval?: number }) {
  const [active, setActive] = useState(0);
  const [prev, setPrev] = useState(-1);
  const [loaded, setLoaded] = useState(1);
  const [paused, setPaused] = useState(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) setPaused(true);
    const t = window.setTimeout(() => setLoaded(slides.length), 1600);
    return () => window.clearTimeout(t);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const t = window.setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      setPrev(active);
      setActive((active + 1) % slides.length);
    }, interval);
    return () => window.clearTimeout(t);
  }, [active, paused, slides.length, interval]);

  const go = (i: number) => {
    if (i === active) return;
    setPrev(active);
    setActive(i);
  };

  return (
    <>
      <div className="absolute inset-0 overflow-hidden">
        {slides.map((s, i) => (
          <div
            key={s.src}
            className={cn("absolute inset-0", variant === "wh" ? "wh-slide" : "sp-slide")}
            data-active={i === active}
            data-prev={variant === "wh" && i === prev && i !== active}
          >
            {i < loaded && <Image src={s.src} alt={i === active ? s.alt : ""} fill priority={i === 0} sizes="100vw" className="object-cover" />}
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-6 right-4 z-20 hidden items-center gap-3 sm:right-6 md:flex lg:bottom-8 lg:right-10">
          <ul className="flex items-center gap-2">
            {slides.map((s, i) => (
              <li key={s.src}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Show photo ${i + 1} of ${slides.length}`}
                  aria-current={i === active}
                  className={cn(
                    "block transition-all duration-500",
                    variant === "wh"
                      ? cn("size-3 rotate-45 border border-wh-saffron", i === active ? "scale-125 bg-wh-saffron" : "bg-transparent hover:bg-wh-saffron/50")
                      : cn("h-1 rounded-full", i === active ? "w-10 bg-sp-crimson" : "w-5 bg-white/40 hover:bg-white/70"),
                  )}
                />
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Play background photos" : "Pause background photos"}
            className={cn(
              "flex size-8 items-center justify-center text-[10px] font-bold transition",
              variant === "wh" ? "rounded-full text-wh-cream ring-1 ring-wh-cream/40 hover:bg-wh-cream/15" : "rounded-md text-white ring-1 ring-white/30 hover:bg-white/15",
            )}
          >
            <span aria-hidden>{paused ? "▶" : "❚❚"}</span>
          </button>
        </div>
      )}
    </>
  );
}
