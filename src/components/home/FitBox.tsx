"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Scales content designed at a fixed size (e.g. a 520 px laptop screen) to the
 * container's width. Before hydration it uses `fallbackScale`, so the
 * illustration is visible without JavaScript (just slightly off-size).
 */
export function FitBox({
  width,
  height,
  fallbackScale = 0.8,
  className,
  children,
}: {
  width: number;
  height: number;
  fallbackScale?: number;
  className?: string;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  return (
    <div ref={box} className={cn("relative w-full overflow-hidden", className)} style={{ aspectRatio: `${width} / ${height}` }}>
      <div style={{ position: "absolute", top: 0, left: 0, width, height, transform: `scale(${scale ?? fallbackScale})`, transformOrigin: "top left" }}>
        {children}
      </div>
    </div>
  );
}
