"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CARD_SPOTLIGHT } from "@/content/marketing";

const MAX_TILT = 8;
const FLIP_EVERY_MS = 4000;

/**
 * 3D visiting card (DESIGN_BRIEF.md §4.7): tilts up to 8° following the
 * pointer (fine pointers only), flips front ↔ back every 4 s while in view
 * (600 ms rotateY) and flips on tap. Reduced motion: no tilt, no auto-flip.
 * Front and back are rendered on the server and passed in.
 */
export function CardSpotlight({ front, back, ratio }: { front: ReactNode; back: ReactNode; ratio: number }) {
  const [flipped, setFlipped] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const wrap = useRef<HTMLDivElement>(null);
  const reduced = useRef(false);
  const fine = useRef(false);
  const interacted = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    fine.current = window.matchMedia("(pointer: fine)").matches;
    const el = wrap.current;
    if (!el || reduced.current) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const io = new IntersectionObserver(([e]) => {
      clearInterval(timer);
      if (e?.isIntersecting) timer = setInterval(() => !interacted.current && setFlipped((f) => !f), FLIP_EVERY_MS);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      clearInterval(timer);
    };
  }, []);

  function onMove(e: React.PointerEvent) {
    if (!fine.current || reduced.current || !wrap.current) return;
    const r = wrap.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * MAX_TILT * 2, y: px * MAX_TILT * 2 });
  }

  return (
    <div ref={wrap} className="w-full [perspective:1400px]" onPointerMove={onMove} onPointerLeave={() => setTilt({ x: 0, y: 0 })}>
      <div className="transition-transform duration-200 ease-out" style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transformStyle: "preserve-3d" }}>
        <button
          type="button"
          onClick={() => {
            interacted.current = true;
            setFlipped((f) => !f);
          }}
          aria-pressed={flipped}
          aria-label={CARD_SPOTLIGHT.flipHint}
          className="relative block w-full rounded-xl transition-transform duration-[600ms] ease-in-out [transform-style:preserve-3d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
          style={{ aspectRatio: String(ratio), transform: `rotateY(${flipped ? 180 : 0}deg)` }}
        >
          <span className="absolute inset-0 [backface-visibility:hidden]">{front}</span>
          <span className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">{back}</span>
        </button>
      </div>
    </div>
  );
}
