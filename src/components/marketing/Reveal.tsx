"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Section reveal (DESIGN_BRIEF.md §3): fade-up 16 px, 450 ms ease-out, once,
 * when 20% of the section is in view. Children marked `data-reveal-item`
 * stagger by 70 ms. Plain CSS transitions (styles in globals.css), so no
 * animation library ships for it.
 *
 * Content is visible without JavaScript; only sections that start below the
 * fold are hidden on hydration and then revealed. With prefers-reduced-motion
 * nothing is hidden at all.
 */
export function Reveal({
  children,
  className,
  as: Tag = "div",
  id,
  ...rest
}: { children: ReactNode; className?: string; as?: "div" | "section"; id?: string } & Pick<React.HTMLAttributes<HTMLElement>, "aria-labelledby" | "aria-label">) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"static" | "hidden" | "shown">("static");

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return; // already on screen
    el.querySelectorAll<HTMLElement>("[data-reveal-item]").forEach((item, i) => item.style.setProperty("--reveal-i", String(Math.min(i, 8))));
    setState("hidden");
    const io = new IntersectionObserver(
      (entries) => {
        // 20% of the section, or 40% of the screen for sections taller than the viewport.
        if (entries.some((e) => e.intersectionRatio >= 0.2 || e.intersectionRect.height >= window.innerHeight * 0.4)) {
          setState("shown");
          io.disconnect();
        }
      },
      { threshold: [0, 0.1, 0.2] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} id={id} data-reveal={state} className={cn(className)} {...rest}>
      {children}
    </Tag>
  );
}
