"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Shows a card designed at a fixed pixel size (e.g. 1004 × 650) scaled down to
 * fit its container, keeping the exact layout the PNG/PDF will have.
 * `interactive`: the card's buttons are real links (the live card page), so
 * the card is a labelled group rather than a picture.
 */
export function CardFrame({
  width,
  height,
  label,
  className,
  interactive,
  fallbackScale,
  children,
}: {
  width: number;
  height: number;
  label: string;
  className?: string;
  interactive?: boolean;
  /** Scale before the frame is measured, so the card shows without waiting for JavaScript (else it stays hidden until then). */
  fallbackScale?: number;
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
      role={interactive ? "group" : "img"}
      aria-label={label}
      className={cn("relative w-full overflow-hidden rounded-xl shadow-soft ring-1 ring-line", className)}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <div
        aria-hidden={interactive ? undefined : true}
        // Absolutely positioned so the full-size card never widens the layout.
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          transform: `scale(${scale || fallbackScale || 0})`,
          transformOrigin: "top left",
          visibility: scale || fallbackScale ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
