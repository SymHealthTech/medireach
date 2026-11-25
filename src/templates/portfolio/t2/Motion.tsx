"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scroll animations for the Clinic Modern design. One observer arms the page
 * (adds `cm-armed`, so visitors without JS see everything) and marks each
 * `.cm-reveal` element with `data-shown` as it scrolls into view. A scroll
 * fallback catches jump-scrolls where IntersectionObserver lags.
 */
export function RevealObserver({ rootId }: { rootId: string }) {
  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(".cm-reveal"));
    const show = (el: Element) => el.setAttribute("data-shown", "");
    // Anything already on screen shows at once, without a flash.
    const vh = window.innerHeight;
    for (const el of items) if (el.getBoundingClientRect().top < vh * 0.92) show(el);
    root.classList.add("cm-armed");

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            show(e.target);
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    for (const el of items) if (!el.hasAttribute("data-shown")) io.observe(el);

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const limit = window.innerHeight * 0.95;
        for (const el of items) if (!el.hasAttribute("data-shown") && el.getBoundingClientRect().top < limit) show(el);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [rootId]);
  return null;
}

/** A number that counts up from 0 the first time it scrolls into view. */
export function CountUp({ value, suffix = "", duration = 1600 }: { value: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // already visible: keep the final number
    setShown(0);
    const run = () => {
      if (done.current) return;
      done.current = true;
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / duration);
        setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && run(), { threshold: 0.4 });
    io.observe(el);
    const onScroll = () => el.getBoundingClientRect().top < window.innerHeight * 0.9 && run();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {shown.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}
