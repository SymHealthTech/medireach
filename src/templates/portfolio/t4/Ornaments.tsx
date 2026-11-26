import { cn } from "@/lib/cn";

/**
 * Decorative pieces for Warm Heritage: a line-drawn mandala, an ornamental
 * divider and the pointed "jharokha" arch used to frame photos. All are
 * aria-hidden decoration.
 */

/** Line mandala: rings of petals and dots, drawn in currentColor. */
export function Mandala({ className, strokeWidth = 1 }: { className?: string; strokeWidth?: number }) {
  const rings = [
    { n: 8, r: 18, rx: 6, ry: 13 },
    { n: 12, r: 36, rx: 7, ry: 16 },
    { n: 16, r: 58, rx: 7, ry: 15 },
    { n: 24, r: 80, rx: 5, ry: 12 },
  ];
  return (
    <svg aria-hidden viewBox="-100 -100 200 200" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
      <circle r="8" />
      <circle r="27" opacity=".6" />
      <circle r="48" opacity=".5" />
      <circle r="70" opacity=".45" />
      <circle r="94" opacity=".35" />
      {rings.map((ring) =>
        Array.from({ length: ring.n }, (_, i) => (
          <ellipse key={`${ring.r}-${i}`} cx="0" cy={-ring.r} rx={ring.rx} ry={ring.ry} transform={`rotate(${(360 / ring.n) * i + (ring.n % 16 === 0 ? 360 / ring.n / 2 : 0)})`} />
        )),
      )}
      {Array.from({ length: 32 }, (_, i) => (
        <circle key={`d-${i}`} cx="0" cy="-94" r="1.6" fill="currentColor" stroke="none" transform={`rotate(${(360 / 32) * i})`} />
      ))}
    </svg>
  );
}

/** Thin rule with a diamond and two dots in the middle. */
export function Divider({ className, center }: { className?: string; center?: boolean }) {
  return (
    <span aria-hidden className={cn("flex items-center gap-2 text-wh-saffron", center && "justify-center", className)}>
      <span className="h-px w-10 bg-gradient-to-r from-transparent to-current" />
      <span className="size-1 rounded-full bg-current" />
      <span className="size-2 rotate-45 border border-current" />
      <span className="size-1 rounded-full bg-current" />
      <span className="h-px w-10 bg-gradient-to-l from-transparent to-current" />
    </span>
  );
}

/** Defines the arch clip path once per page; use `style={{ clipPath: "url(#wh-arch)" }}`. */
export function ArchDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <defs>
        <clipPath id="wh-arch" clipPathUnits="objectBoundingBox">
          <path d="M0,1 V0.34 C0,0.2 0.2,0.12 0.36,0.07 C0.44,0.045 0.48,0.02 0.5,0 C0.52,0.02 0.56,0.045 0.64,0.07 C0.8,0.12 1,0.2 1,0.34 V1 Z" />
        </clipPath>
      </defs>
    </svg>
  );
}

/** Small lotus-like flourish used as a bullet / icon backdrop. */
export function Rosette({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="-50 -50 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="1.2">
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse key={i} cx="0" cy="-26" rx="10" ry="20" transform={`rotate(${45 * i})`} />
      ))}
      <circle r="44" opacity=".5" />
    </svg>
  );
}
