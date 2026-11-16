import Image from "next/image";
import { cn } from "@/lib/cn";

/** The site icon (teal speech bubble with a pulse line), served from public/. */
export const BRAND_ICON_SRC = "/icon-192.png";

/**
 * MediReach logo: the icon followed by "MediReach" in Fraunces. `tone="light"`
 * is for ink backgrounds (public footer, dashboard sidebar) and stays light in
 * dark mode too. The icon scales with the text size (1.3em).
 */
export function LogoWordmark({ className, tone = "ink" }: { className?: string; tone?: "ink" | "light" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-display text-[22px] font-semibold leading-none tracking-tight",
        tone === "ink" ? "text-ink" : "text-[#fbf8f3]",
        className,
      )}
    >
      <Image src={BRAND_ICON_SRC} alt="" width={192} height={192} priority className="size-[1.3em] shrink-0" />
      MediReach
    </span>
  );
}

/** Square mark for small spaces: the site icon on its own. */
export function LogoMark({ className }: { className?: string }) {
  return <Image src={BRAND_ICON_SRC} alt="MediReach" width={192} height={192} className={cn("size-9 shrink-0", className)} />;
}
