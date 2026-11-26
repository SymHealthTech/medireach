"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { StockPhoto } from "@/templates/shared/specialty-photos";

const INTERVAL_MS = 6000;

/**
 * Serene Care hero background: photos cross-fade with a slow zoom (shared
 * `cm-slide` styles), with a small pause button bottom-right. Stays still for reduced-motion
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
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Play background photos" : "Pause background photos"}
          className="absolute bottom-6 right-4 z-20 hidden size-9 items-center justify-center rounded-full bg-white/70 text-sc-plum ring-1 ring-sc-line backdrop-blur transition hover:bg-white md:flex lg:bottom-9 lg:right-8"
        >
          {paused ? <Play aria-hidden className="size-3.5" fill="currentColor" /> : <Pause aria-hidden className="size-3.5" fill="currentColor" />}
        </button>
      )}
    </>
  );
}
