import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { FitBox } from "./FitBox";

/**
 * Device frames for homepage illustrations. Decorative: hidden from assistive
 * tech and not focusable. Content is designed at a fixed width and scaled with
 * CSS so the frames keep their proportions at every screen size.
 */

/** Phone, 260 × 520 at scale 1. */
export function PhoneFrame({
  children,
  className,
  badge,
  scale = 1,
}: {
  children: ReactNode;
  className?: string;
  badge?: string;
  scale?: number;
}) {
  return (
    <div
      aria-hidden
      inert
      className={cn("relative shrink-0 select-none", className)}
      style={{ width: 260 * scale, height: 520 * scale }}
    >
      {/* The 260 px phone is scaled visually; clip its layout box so it never widens the page (shadow kept by the clip margin). */}
      <div className="absolute inset-0 [overflow-clip-margin:24px] [overflow:clip]">
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: 260,
            transform: scale === 1 ? undefined : `scale(${scale})`,
          }}
        >
          <div className="overflow-hidden rounded-[34px] border-[9px] border-ink bg-ink shadow-soft">
            <div className="relative h-[502px] overflow-hidden rounded-[25px] bg-paper">
              <div className="absolute left-1/2 top-1.5 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-ink" />
              <div className="pt-6">{children}</div>
            </div>
          </div>
        </div>
      </div>
      {badge && (
        <SampleBadge className="absolute -top-3 left-1/2 -translate-x-1/2">
          {badge}
        </SampleBadge>
      )}
    </div>
  );
}

/** Laptop: screen content designed at 520 px wide, scaled to the frame's width. */
export function LaptopFrame({
  children,
  className,
  url,
  badge,
}: {
  children: ReactNode;
  className?: string;
  url?: string;
  badge?: string;
}) {
  return (
    <div
      aria-hidden
      inert
      className={cn("relative w-full select-none", className)}
    >
      <div className="rounded-t-[14px] border-[7px] border-b-0 border-ink bg-ink">
        <div className="overflow-hidden rounded-t-[7px] bg-white">
          <div className="flex items-center gap-1.5 border-b border-line bg-[#f4f1ea] px-2 py-1.5">
            <span className="size-1.5 rounded-full bg-clay/60" />
            <span className="size-1.5 rounded-full bg-marigold/70" />
            <span className="size-1.5 rounded-full bg-leaf/60" />
            {url && (
              <span className="ml-1 flex-1 truncate rounded bg-white px-2 py-0.5 text-[8px] text-muted-foreground">
                {url}
              </span>
            )}
          </div>
          <FitBox width={520} height={322} fallbackScale={0.75}>
            {children}
          </FitBox>
        </div>
      </div>
      <div className="relative mx-[-6%] h-3 rounded-b-xl bg-gradient-to-b from-[#1b4f50] to-ink shadow-soft">
        <span className="absolute left-1/2 top-0 h-1.5 w-16 -translate-x-1/2 rounded-b-md bg-[#0a2e2f]" />
      </div>
      {badge && (
        <SampleBadge className="absolute -top-3 left-4">{badge}</SampleBadge>
      )}
    </div>
  );
}

export function SampleBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "z-10 rounded-full bg-marigold px-3 py-1 text-xs font-semibold text-[#0e3b3c] shadow-soft",
        className,
      )}
    >
      {children}
    </span>
  );
}
