import { MapPin } from "lucide-react";
import { LogoWordmark } from "@/components/brand/Logo";
import { MiniProfile } from "@/components/marketing/Mockups";
import { CARD_SPOTLIGHT, HERO, MARQUEE, MULTI_DOCTOR, type Audience } from "@/content/marketing";
import { cardProps } from "@/lib/cards/render";
import { cn } from "@/lib/cn";
import { QrBlock } from "@/templates/card/parts";
import { resolveCardTemplate } from "@/templates/registry";
import { CARD_SIZE, type PublicDoctor } from "@/templates/types";
import { THEME_ICONS } from "@/themes/icons";
import type { SpecialtyTheme } from "@/themes/specialty";
import { FitBox } from "./FitBox";
import { LaptopFrame, PhoneFrame } from "./Frames";
import { LoopGuard } from "./LoopGuard";
import { MiniSiteLaptop, type MiniSiteData } from "./MiniSite";

/** Server-rendered homepage pieces (no client JavaScript of their own). */

// ---------------------------------------------------------------------------
// Visiting card faces
// ---------------------------------------------------------------------------

/** QR scan line over the Classic print card's QR (left panel). Decorative. */
function ScanLine({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("pointer-events-none absolute overflow-hidden", className)}>
      <span className="mr-scan absolute inset-0">
        <span className="block h-[3px] rounded-full bg-marigold shadow-[0_0_10px_2px_rgba(242,153,74,.7)]" />
      </span>
    </span>
  );
}

/** Front: the doctor's real Classic print card (same template as the PDF), with the scan line. */
export function CardFront({ doctor, className, fallbackScale = 0.24 }: { doctor: PublicDoctor; className?: string; fallbackScale?: number }) {
  const Card = resolveCardTemplate(doctor.portfolioTemplateId);
  const { width, height } = CARD_SIZE.print;
  return (
    <div className={cn("relative", className)}>
      {/* FitBox (not CardFrame) so the card is visible before hydration. */}
      <FitBox width={width} height={height} fallbackScale={fallbackScale} className="rounded-xl shadow-[0_18px_40px_-10px_rgba(10,63,63,.35)]">
        <Card {...cardProps(doctor, "print", "html")} />
      </FitBox>
      {/* The QR sits in the left ink panel of the Classic card (1004 × 650 design). */}
      <ScanLine className="left-[8.6%] top-[52%] h-[28%] w-[15.5%]" />
    </div>
  );
}

/** Back: brand side with a large QR. Designed at the print card's 1004 × 650 and scaled. */
export function CardBack({ doctor }: { doctor: PublicDoctor }) {
  const { width, height } = CARD_SIZE.print;
  const qr = cardProps(doctor, "print", "html").qr;
  return (
    <div className="overflow-hidden rounded-xl shadow-[0_18px_40px_-10px_rgba(10,63,63,.35)]">
      <FitBox width={width} height={height} fallbackScale={0.4}>
        <div className="mr-ink-bg flex items-center justify-between gap-10 px-[70px] text-paper" style={{ width, height }}>
          <div className="min-w-0 max-w-[480px] space-y-6">
            <LogoWordmark tone="light" className="origin-left scale-[1.6]" />
            <p className="pt-10 font-display text-[54px] font-semibold leading-[1.05]">{doctor.fullName}</p>
            <p className="text-[30px] text-paper/75">{CARD_SPOTLIGHT.back.sub}</p>
          </div>
          <div className="relative flex flex-col items-center gap-5">
            <div className="relative rounded-[28px] bg-white p-4">
              <QrBlock qr={qr} px={300} radius={20} />
              <ScanLine className="inset-4" />
            </div>
            <p className="text-[28px] font-semibold text-marigold">{CARD_SPOTLIGHT.back.scan}</p>
          </div>
        </div>
      </FitBox>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero device stages (§4.2)
// ---------------------------------------------------------------------------

/** Pale teal disc with a thin outer ring and two small accents. Decorative. */
function StageBackdrop() {
  return (
    <div aria-hidden className="absolute inset-0 -z-10">
      <div className="absolute left-1/2 top-1/2 aspect-square w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-lagoon/25" />
      <div className="absolute left-1/2 top-1/2 aspect-square w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_30%_25%,#ffffff_0%,var(--sage)_55%,#c6e8e3_100%)] shadow-[inset_0_-12px_40px_rgba(14,124,123,.10)]" />
      <span className="absolute right-[9%] top-[14%] size-3.5 rounded-full bg-marigold shadow-[0_0_0_6px_rgba(242,153,74,.18)]" />
      <span className="absolute bottom-[16%] left-[8%] size-2.5 rounded-full bg-lagoon/70" />
    </div>
  );
}

/** One device per hero slide: the doctor's phone, or the clinic / hospital site in a laptop. */
export function HeroStage({ audience, doctor, site, hostname }: { audience: Audience; doctor: PublicDoctor; site?: MiniSiteData; hostname: string }) {
  const url = `${HERO.audiences[audience].subdomain}.${hostname}`;
  return (
    <div className="relative isolate mx-auto flex h-[400px] w-full max-w-[480px] items-center justify-center">
      <StageBackdrop />
      {audience === "doctor" ? (
        <PhoneFrame scale={0.72}>
          <MiniProfile doctor={doctor} />
        </PhoneFrame>
      ) : (
        site && (
          <div className="w-full">
            <LaptopFrame url={url}>
              <MiniSiteLaptop site={site} />
            </LaptopFrame>
          </div>
        )
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Specialty marquee (§4.3)
// ---------------------------------------------------------------------------

export function SpecialtyMarquee({ themes }: { themes: readonly SpecialtyTheme[] }) {
  const row = (hidden: boolean) =>
    themes.map((t) => {
      const Icon = THEME_ICONS[t.icon];
      return (
        <li key={`${t.key}-${hidden}`} aria-hidden={hidden || undefined}>
          <a
            href={`#design-${t.key}`}
            tabIndex={hidden ? -1 : undefined}
            className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:border-ink/40"
          >
            <Icon className="size-4" strokeWidth={1.75} style={{ color: t.palette.primary }} />
            {t.name}
          </a>
        </li>
      );
    });
  return (
    <nav aria-label={MARQUEE.label} className="mr-marquee-wrap overflow-hidden border-y border-line bg-paper py-4 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
      <LoopGuard>
        <ul className="mr-marquee flex w-max gap-3 pr-3 motion-reduce:w-auto motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:px-4">
          {row(false)}
          <span className="contents motion-reduce:hidden">{row(true)}</span>
        </ul>
      </LoopGuard>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Multi-doctor diagram (§4.11)
// ---------------------------------------------------------------------------

export function MultiDoctorDiagram({ centre = MULTI_DOCTOR.clinic }: { centre?: string }) {
  return (
    <div aria-hidden className="mx-auto w-full max-w-[480px]">
      <div className="mx-auto w-fit rounded-2xl bg-ink px-5 py-4 text-center text-paper shadow-lift">
        <MapPin className="mx-auto size-5 text-marigold" strokeWidth={2} />
        <p className="mt-1 font-display text-lg font-semibold">{centre}</p>
      </div>
      <svg viewBox="0 0 300 70" className="h-16 w-full" preserveAspectRatio="none">
        {[50, 150, 250].map((x) => (
          <path key={x} d={`M150 0 C150 35, ${x} 35, ${x} 70`} fill="none" className="stroke-ink/40" strokeWidth="2" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="grid grid-cols-3 gap-3">
        {MULTI_DOCTOR.doctors.map((d) => (
          <div key={d} className="rounded-xl bg-surface p-3 text-center shadow-soft">
            <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-sage font-display font-semibold text-ink">
              {d.replace(/^Dr\.\s*/, "")[0]}
            </span>
            <p className="mt-2 truncate text-sm font-semibold text-ink">{d}</p>
            <p className="text-[11px] text-muted-foreground">{MULTI_DOCTOR.doctorRole}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
