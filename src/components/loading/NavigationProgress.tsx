"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { BrandLoader } from "./BrandLoader";

/**
 * Feedback while the next page loads, so a slow page never looks frozen:
 * a thin teal→amber bar at the top starts the moment a link is clicked and
 * creeps forward; if the page takes longer than SLOW_MS, the MediReach
 * loader fades in over the current page. Both end when the URL changes.
 *
 * Starts on clicks on same-site links (not new tabs, downloads, hash jumps
 * or the current page) and on `startNavigationProgress()` for code that
 * calls router.push. (Back/forward is skipped: those pages come from the
 * router cache, and a hash change would never end the bar.) Add `data-no-progress` to a link that
 * doesn't navigate.
 */

const START_EVENT = "mr:navigation-start";
const SLOW_MS = 600;
/** Never leave the bar running if a navigation is cancelled or fails silently. */
const GIVE_UP_MS = 20_000;

/** Call before router.push / router.replace / window.location.assign to show progress. */
export function startNavigationProgress() {
  window.dispatchEvent(new Event(START_EVENT));
}

const sameDocument = (a: URL, b: URL) => a.pathname === b.pathname && a.search === b.search;

export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");
  const [width, setWidth] = useState(0);
  const [slow, setSlow] = useState(false);
  const timers = useRef<{ trickle?: number; slow?: number; giveUp?: number; hide?: number }>({});

  const clear = () => {
    const t = timers.current;
    window.clearInterval(t.trickle);
    window.clearTimeout(t.slow);
    window.clearTimeout(t.giveUp);
    window.clearTimeout(t.hide);
    timers.current = {};
  };

  const finish = useRef(() => {});
  finish.current = () => {
    if (phase !== "loading") return;
    clear();
    setSlow(false);
    setWidth(100);
    setPhase("done");
    timers.current.hide = window.setTimeout(() => {
      setPhase("idle");
      setWidth(0);
    }, 350);
  };

  const start = useRef(() => {});
  start.current = () => {
    clear();
    setPhase("loading");
    setSlow(false);
    setWidth(8);
    // Ease towards 90 %: big steps first, then ever smaller.
    timers.current.trickle = window.setInterval(() => setWidth((w) => w + (90 - w) * 0.08), 200);
    timers.current.slow = window.setTimeout(() => setSlow(true), SLOW_MS);
    timers.current.giveUp = window.setTimeout(() => finish.current(), GIVE_UP_MS);
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement)) return;
      if (a.hasAttribute("download") || a.hasAttribute("data-no-progress") || (a.target && a.target !== "_self")) return;
      const to = new URL(a.href, window.location.href);
      if (to.origin !== window.location.origin || sameDocument(to, new URL(window.location.href))) return;
      start.current();
    };
    const onStart = () => start.current();
    // Back from another site (bfcache): the old bar must not still be running.
    const onShow = (e: PageTransitionEvent) => e.persisted && finish.current();
    document.addEventListener("click", onClick);
    window.addEventListener(START_EVENT, onStart);
    window.addEventListener("pageshow", onShow);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener(START_EVENT, onStart);
      window.removeEventListener("pageshow", onShow);
      clear();
    };
  }, []);

  // The new page is on screen once the URL the app renders changes.
  useEffect(() => {
    finish.current();
  }, [pathname, search]);

  if (phase === "idle") return null;
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]">
        <div
          className="h-full rounded-r-full bg-gradient-to-r from-lagoon via-lagoon to-marigold shadow-[0_0_10px_rgb(14_124_123/0.6),0_0_4px_rgb(242_153_74/0.6)] transition-[width,opacity] duration-300 ease-out"
          style={{ width: `${width}%`, opacity: phase === "done" ? 0 : 1 }}
        />
      </div>
      {slow && phase === "loading" && (
        <div className="mr-fade-in pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-white/55 backdrop-blur-[2px]">
          <div className="rounded-3xl bg-white/95 px-10 py-8 shadow-[0_20px_60px_rgb(10_63_63/0.18)] ring-1 ring-ink/5">
            <BrandLoader label="Loading" />
          </div>
        </div>
      )}
    </>
  );
}
