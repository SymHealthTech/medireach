"use client";

import { useEffect, useRef, useState } from "react";

/**
 * "How it works" connector (DESIGN_BRIEF.md §3): draws itself (path length
 * 0 → 1) as you scroll through the section — from its top reaching 85% of the
 * screen to its bottom reaching 55%. A plain scroll listener (only while on
 * screen) sets the stroke offset; no re-renders. A faint dashed line
 * underneath keeps the steps connected without JavaScript.
 */
export function DrawLine({ vertical, className }: { vertical?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const line = useRef<SVGPathElement>(null);

  useEffect(() => {
    const el = ref.current;
    const path = line.current;
    if (!el || !path) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      path.style.strokeDashoffset = "0";
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = Math.min(1, Math.max(0, (0.85 * vh - r.top) / (0.3 * vh + r.height)));
      path.style.strokeDashoffset = String(1 - progress);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) {
        window.addEventListener("scroll", onScroll, { passive: true });
        update();
      } else {
        window.removeEventListener("scroll", onScroll);
        update();
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const d = vertical ? "M1 0 V100" : "M0 1 H100";
  return (
    <div ref={ref} aria-hidden className={className}>
      <svg viewBox={vertical ? "0 0 2 100" : "0 0 100 2"} preserveAspectRatio="none" className="size-full overflow-visible">
        <path d={d} className="stroke-lagoon/25" strokeWidth="2" strokeDasharray="4 6" fill="none" vectorEffect="non-scaling-stroke" />
        <path ref={line} d={d} className="stroke-marigold" strokeWidth="3" strokeLinecap="round" fill="none" pathLength={1} strokeDasharray="1" strokeDashoffset="1" />
      </svg>
    </div>
  );
}

/** Counts up to `value` over 900 ms when scrolled into view; shows the value without JavaScript. */
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || value <= 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // already visible: keep the number
    setShown(0);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - start) / 900);
        setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return (
    <span ref={ref} className="tabular-nums">
      {shown}
    </span>
  );
}

/** Marigold underline that draws itself under a phrase when it scrolls into view. */
export function DrawUnderline({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [drawn, setDrawn] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    setDrawn(false);
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) {
        setDrawn(true);
        io.disconnect();
      }
    }, { threshold: 1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <span ref={ref} className="relative inline-block whitespace-nowrap">
      {children}
      <svg aria-hidden viewBox="0 0 200 12" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full">
        <path
          d="M2 8 C 50 2, 120 2, 198 7"
          fill="none"
          stroke="var(--color-marigold, #F2994A)"
          strokeWidth="4"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={drawn ? 0 : 1}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
    </span>
  );
}
