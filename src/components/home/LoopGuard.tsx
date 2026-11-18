"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Pauses CSS loops (marquee, float, QR scan) while they are off screen
 * (DESIGN_BRIEF.md §3): sets `data-offscreen`, and globals.css pauses every
 * animation inside it.
 */
export function LoopGuard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [off, setOff] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOff(!e!.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-offscreen={off ? "" : undefined} className={cn(className)}>
      {children}
    </div>
  );
}
