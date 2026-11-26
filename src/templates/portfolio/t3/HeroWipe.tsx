"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StockPhoto } from "@/templates/shared/specialty-photos";

const INTERVAL_MS = 6500;

/**
 * Modern Edge hero background: each new photo wipes in from the right over
 * the last one (`me-slide`), then zooms slowly. A counter panel bottom-right
 * shows "01 / 04", the caption and prev/next buttons. Still for
 * reduced-motion visitors and hidden tabs; only the first photo loads eagerly.
 */
export function HeroWipe({ slides }: { slides: StockPhoto[] }) {
  const [active, setActive] = useState(0);
  const [prev, setPrev] = useState(-1);
  const [loaded, setLoaded] = useState(1);
  const [hover, setHover] = useState(false);
  const reduced = useRef(false);

  const go = (i: number) => {
    if (i === active) return;
    setPrev(active);
    setActive(i);
  };

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => setLoaded(slides.length), 1600);
    return () => window.clearTimeout(t);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2 || hover || reduced.current) return;
    const t = window.setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      setPrev(active);
      setActive((active + 1) % slides.length);
    }, INTERVAL_MS);
    return () => window.clearTimeout(t);
  }, [active, hover, slides.length]);

  const n = slides.length;
  const pad = (x: number) => String(x).padStart(2, "0");

  return (
    <>
      <div className="absolute inset-0 overflow-hidden bg-me-ink">
        {slides.map((s, i) => (
          <div key={s.src} className="me-slide absolute inset-0" data-active={i === active} data-prev={i === prev && i !== active}>
            {i < loaded && <Image src={s.src} alt={i === active ? s.alt : ""} fill priority={i === 0} sizes="100vw" className="object-cover" />}
          </div>
        ))}
      </div>

      {n > 1 && (
        <div
          className="absolute bottom-0 right-0 z-20 hidden w-[340px] bg-me-ink/80 p-6 text-white backdrop-blur-md xl:block"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          <div className="flex items-end justify-between gap-4">
            <p className="font-bold tabular-nums">
              <span className="text-4xl leading-none text-me-orange">{pad(active + 1)}</span>
              <span className="text-white/40"> / {pad(n)}</span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => go((active - 1 + n) % n)}
                aria-label="Previous photo"
                className="flex size-10 items-center justify-center ring-1 ring-white/25 transition hover:bg-white hover:text-me-ink"
              >
                <ChevronLeft aria-hidden className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => go((active + 1) % n)}
                aria-label="Next photo"
                className="flex size-10 items-center justify-center bg-me-orange transition hover:bg-me-orange-2"
              >
                <ChevronRight aria-hidden className="size-5" />
              </button>
            </div>
          </div>
          {slides[active]?.caption && (
            <p key={active} className="cm-rise mt-4 text-sm font-bold uppercase tracking-[0.2em] text-white/85">
              {slides[active]!.caption}
            </p>
          )}
          <div className="mt-4 flex gap-1.5">
            {slides.map((s, i) => (
              <span key={s.src} className="relative h-[3px] flex-1 overflow-hidden bg-white/20">
                {i < active && <span className="absolute inset-0 bg-white/70" />}
                {i === active && (
                  <span
                    key={`p-${active}-${hover}`}
                    className={cn("absolute inset-0 bg-me-orange", !hover && "cm-progress")}
                    style={{ ["--cm-interval" as string]: `${INTERVAL_MS}ms` }}
                  />
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
