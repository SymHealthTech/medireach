"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Shows a card designed at a fixed pixel size (e.g. 1004 × 650) scaled down to
 * fit its container, keeping the exact layout the PNG/PDF will have.
 */
export function CardFrame({
  width,
  height,
  label,
  className,
  children,
}: {
  width: number;
  height: number;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

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
    <div
      ref={box}
      role="img"
      aria-label={label}
      className={cn("relative w-full overflow-hidden rounded-xl shadow-soft ring-1 ring-line", className)}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <div
        aria-hidden
        // Absolutely positioned so the full-size card never widens the layout.
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          visibility: scale ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
