"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Search } from "lucide-react";
import { FOUND } from "@/content/marketing";
import { cn } from "@/lib/cn";

const TYPE_MS = 45;
const PAUSE_MS = 1200;
const SHOW_MS = 3200;

/**
 * Animated search illustration (DESIGN_BRIEF.md §4.4): a generic search box
 * (no search-engine logo or branding) types a query, pauses, and a MediReach
 * result slides up. Cycles through three fictional queries. Shows the final
 * state with reduced motion or without JavaScript; pauses off screen.
 */
export function SearchDemo() {
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState(FOUND.queries[0]!.q);
  const [showResult, setShowResult] = useState(true);
  const box = useRef<HTMLDivElement>(null);
  const visible = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = box.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let q = 0;
    let pos = 0;
    let phase: "typing" | "pause" | "show" = "typing";

    const tick = () => {
      if (!visible.current) return; // resumed by the observer
      const query = FOUND.queries[q]!.q;
      if (phase === "typing") {
        pos += 1;
        setTyped(query.slice(0, pos));
        if (pos >= query.length) phase = "pause";
        timer = setTimeout(tick, pos >= query.length ? PAUSE_MS : TYPE_MS);
      } else if (phase === "pause") {
        setShowResult(true);
        phase = "show";
        timer = setTimeout(tick, SHOW_MS);
      } else {
        q = (q + 1) % FOUND.queries.length;
        pos = 0;
        phase = "typing";
        setI(q);
        setShowResult(false);
        setTyped("");
        timer = setTimeout(tick, 400);
      }
    };

    // Start from an empty box the first time it scrolls into view.
    let started = false;
    const io = new IntersectionObserver(([e]) => {
      visible.current = Boolean(e?.isIntersecting);
      clearTimeout(timer);
      if (!visible.current) return;
      if (!started) {
        started = true;
        setShowResult(false);
        setTyped("");
      }
      timer = setTimeout(tick, 500);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, []);

  const r = FOUND.queries[i]!;
  return (
    <figure className="w-full max-w-[520px]">
      <div ref={box} aria-hidden className="rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-6">
        <div className="flex h-12 items-center gap-3 rounded-full border border-line bg-paper px-4 shadow-[inset_0_1px_2px_rgba(10,63,63,.06)]">
          <Search className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="min-w-0 flex-1 truncate text-[15px] text-ink">
            {typed}
            <span className="mr-caret ml-px inline-block h-5 w-px translate-y-1 bg-ink" />
          </span>
        </div>
        <div className="mt-5 min-h-[150px] space-y-3">
          <div
            className={cn(
              "rounded-xl border border-line p-4 transition-[opacity,transform] duration-300 ease-out",
              showResult ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
            )}
          >
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex size-6 items-center justify-center rounded-full bg-sage">
                <Globe className="size-3.5 text-ink" strokeWidth={2} />
              </span>
              <span className="truncate">{r.url}</span>
              <span className="ml-auto shrink-0 rounded-full bg-marigold/25 px-2 py-0.5 text-[11px] font-semibold text-ink">{r.kind}</span>
            </p>
            <p className="mt-2 font-semibold leading-snug text-[#1a5fb4]">{r.title}</p>
            <p className="mt-1 text-sm text-body/80">{r.text}</p>
          </div>
          <div className={cn("space-y-2 px-1 transition-opacity duration-300", showResult ? "opacity-100" : "opacity-0")}>
            <span className="block h-2.5 w-2/3 rounded-full bg-line" />
            <span className="block h-2.5 w-1/2 rounded-full bg-line/70" />
          </div>
        </div>
      </div>
      <figcaption className="mt-2 text-right text-xs text-muted-foreground">{FOUND.caption}</figcaption>
    </figure>
  );
}
