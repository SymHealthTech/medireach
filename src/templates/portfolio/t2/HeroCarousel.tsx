"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export interface Slide {
  src: string;
  alt: string;
  /** Short caption shown bottom-left on large screens. */
  caption?: string;
}

const INTERVAL_MS = 6500;

/**
 * Full-bleed background carousel: cross-fades every few seconds with a slow
 * Ken Burns zoom, pauses while the tab is hidden or the pointer is over the
 * dots, and stays on the first photo for reduced-motion visitors. Only the
 * first photo loads eagerly.
 */
export function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState(1);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Fetch the other photos once the page has settled.
    const t = window.setTimeout(() => setLoaded(slides.length), 1800);
    return () => window.clearTimeout(t);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2 || paused || reduced.current) return;
    const t = window.setTimeout(() => {
      if (document.visibilityState === "visible") setActive((i) => (i + 1) % slides.length);
    }, INTERVAL_MS);
    return () => window.clearTimeout(t);
  }, [active, paused, slides.length]);

  return (
    <div aria-hidden={false} className="absolute inset-0 overflow-hidden">
      {slides.map((s, i) => (
        <div key={s.src} className="cm-slide absolute inset-0" data-active={i === active}>
          {i < loaded && (
            <Image
              src={s.src}
              alt={i === active ? s.alt : ""}
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover"
            />
          )}
        </div>
      ))}

      {slides.length > 1 && (
        <div
          className="absolute bottom-6 right-4 z-20 flex items-center gap-2 sm:right-6 lg:bottom-10 lg:right-10"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {slides.map((s, i) => (
            <button
              key={s.src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1} of ${slides.length}`}
              aria-current={i === active}
              className={cn(
                "relative h-1.5 overflow-hidden rounded-full bg-white/35 transition-all duration-500",
                i === active ? "w-10" : "w-4 hover:bg-white/60",
              )}
            >
              {i === active && !paused && (
                <span
                  key={`p-${active}`}
                  className="cm-progress absolute inset-0 rounded-full bg-white"
                  style={{ ["--cm-interval" as string]: `${INTERVAL_MS}ms` }}
                />
              )}
              {i === active && paused && <span className="absolute inset-0 rounded-full bg-white" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
