"use client";

import type { ReactNode } from "react";
import { LazyMotion, MotionConfig } from "motion/react";

const loadFeatures = () => import("./motion-features").then((m) => m.default);

/**
 * Motion setup for the homepage (DESIGN_BRIEF.md §3): `LazyMotion` with the
 * DOM animation features loaded after hydration, `m.*` components only
 * (strict), and the visitor's reduced-motion setting respected everywhere.
 */
export function MotionRoot({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
