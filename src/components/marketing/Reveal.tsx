"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Fade-up 12px once when a section first scrolls into view (DESIGN_BRIEF.md
 * §2 Motion). Content is visible without JavaScript; only sections that start
 * below the fold are hidden (invisibly) on hydration and then revealed.
 * Skipped entirely with prefers-reduced-motion.
 */
export function Reveal({ children, className, as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"static" | "hidden" | "shown">("static");

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // already on screen
    setState("hidden");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState("shown");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={cn(
        className,
        state === "hidden" && "translate-y-3 opacity-0",
        state === "shown" && "translate-y-0 opacity-100 transition-[opacity,transform] duration-200 ease-out",
      )}
    >
      {children}
    </Tag>
  );
}
