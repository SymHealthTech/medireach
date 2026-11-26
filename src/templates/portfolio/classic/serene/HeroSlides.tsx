"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StockPhoto } from "@/templates/shared/specialty-photos";

const INTERVAL_MS = 6000;

/**
 * Serene Care hero background: photos cross-fade with a slow zoom (shared
 * `cm-slide` styles). Controls sit bottom-left as numbered captions with a
 * filling line, plus a pause button. Stays still for reduced-motion
 * visitors and while the tab is hidden; only the first photo loads eagerly.
 */
export function HeroSlides({ slides }: { slides: StockPhoto[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState(1);
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
      if (document.visibilityState === "visible") setActive((i) => (i + 1) % slides.length);
    }, INTERVAL_MS);
    return () => window.clearTimeout(t);
  }, [active, paused, slides.length]);

  return (
    <>
      <div className="absolute inset-0 overflow-hidden">
        {slides.map((s, i) => (
          <div key={s.src} className="cm-slide absolute inset-0" data-active={i === active}>
            {i < loaded && <Image src={s.src} alt={i === active ? s.alt : ""} fill priority={i === 0} sizes="100vw" className="object-cover object-center" />}
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-6 left-4 right-4 z-20 hidden items-end gap-6 sm:left-6 md:flex lg:bottom-9 lg:left-[max(1.5rem,calc((100vw-1200px)/2+1.5rem))]">
          <ul className="flex gap-5">
            {slides.map((s, i) => (
              <li key={s.src}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Show photo ${i + 1} of ${slides.length}${s.caption ? `: ${s.caption}` : ""}`}
                  aria-current={i === active}
                  className={cn("group w-28 text-left transition-opacity", i === active ? "opacity-100" : "opacity-60 hover:opacity-90")}
                >
                  <span className="relative block h-[2px] overflow-hidden rounded-full bg-sc-plum/20">
                    {i === active && (
                      <span
                        key={`p-${active}-${paused}`}
                        className={cn("absolute inset-0 rounded-full bg-sc-rose", !paused && "cm-progress")}
                        style={{
                          ["--cm-interval" as string]: `${INTERVAL_MS}ms`,
                        }}
                      />
                    )}
                  </span>
                  <span className="mt-2 block text-[11px] font-bold tracking-[0.2em] text-sc-rose">0{i + 1}</span>
                  {s.caption && <span className="block truncate text-xs font-semibold text-sc-plum">{s.caption}</span>}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Play slideshow" : "Pause slideshow"}
            className="mb-1 flex size-9 items-center justify-center rounded-full bg-white/80 text-sc-plum ring-1 ring-sc-line backdrop-blur transition hover:bg-white"
          >
            {paused ? <Play aria-hidden className="size-3.5" fill="currentColor" /> : <Pause aria-hidden className="size-3.5" fill="currentColor" />}
          </button>
        </div>
      )}
    </>
  );
}
