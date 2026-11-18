import Link from "next/link";
import type { ReactNode } from "react";
import { Bookmark, CheckCheck, Clock, Link2, MapPin, Navigation, Siren, UserPlus } from "lucide-react";
import { LogoWordmark } from "@/components/brand/Logo";
import { MiniProfile } from "@/components/marketing/Mockups";
import { CARD_SPOTLIGHT, HERO, MARQUEE, MULTI_DOCTOR, type Audience } from "@/content/marketing";
import { cardProps } from "@/lib/cards/render";
import { cn } from "@/lib/cn";
import { QrBlock } from "@/templates/card/classic";
import { resolveCardTemplate } from "@/templates/registry";
import { CARD_SIZE, type PublicDoctor } from "@/templates/types";
import { THEME_ICONS } from "@/themes/icons";
import type { SpecialtyTheme } from "@/themes/specialty";
import { FitBox } from "./FitBox";
import { LaptopFrame, PhoneFrame } from "./Frames";
import { LoopGuard } from "./LoopGuard";
import { MiniSiteLaptop, MiniSitePhone, type MiniSiteData } from "./MiniSite";

/** Server-rendered homepage pieces (no client JavaScript of their own). */

// ---------------------------------------------------------------------------
// Visiting card faces
// ---------------------------------------------------------------------------

/** QR scan line over the Classic print card's QR (left panel). Decorative. */
function ScanLine({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("pointer-events-none absolute overflow-hidden", className)}>
      <span className="mr-scan absolute inset-0">
        <span className="block h-[3px] rounded-full bg-marigold shadow-[0_0_10px_2px_rgba(227,162,59,.7)]" />
      </span>
    </span>
  );
}

/** Front: the doctor's real Classic print card (same template as the PDF), with the scan line. */
export function CardFront({ doctor, className, fallbackScale = 0.24 }: { doctor: PublicDoctor; className?: string; fallbackScale?: number }) {
  const Card = resolveCardTemplate(doctor.cardTemplateId);
  const { width, height } = CARD_SIZE.print;
  return (
    <div className={cn("relative", className)}>
      {/* FitBox (not CardFrame) so the card is visible before hydration. */}
      <FitBox width={width} height={height} fallbackScale={fallbackScale} className="rounded-xl shadow-[0_18px_40px_-10px_rgba(14,59,60,.35)]">
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
    <div className="overflow-hidden rounded-xl shadow-[0_18px_40px_-10px_rgba(14,59,60,.35)]">
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

function FloatChip({ icon: Icon, children, className, delay = 0 }: { icon: typeof Clock; children: ReactNode; className?: string; delay?: number }) {
  return (
    <span
      aria-hidden
      className={cn("float-gentle absolute z-20 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-soft ring-1 ring-line", className)}
      style={{ animationDelay: `${delay}s` }}
    >
      <Icon className="size-3.5 text-lagoon" strokeWidth={2} />
      {children}
    </span>
  );
}

function StageBackdrop() {
  return (
    <div aria-hidden className="absolute inset-0 -z-10">
      <div className="mr-dots absolute inset-0 [mask-image:radial-gradient(closest-side,black_55%,transparent)]" />
      <div className="absolute left-1/2 top-1/2 aspect-square w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sage blur-2xl" />
      <span className="absolute right-[8%] top-[6%] size-10 rounded-full bg-marigold/80" />
    </div>
  );
}

export function HeroStage({
  audience,
  doctor,
  site,
  hostname,
}: {
  audience: Audience;
  doctor: PublicDoctor;
  site?: MiniSiteData;
  hostname: string;
}) {
  const url = `${HERO.audiences[audience].subdomain}.${hostname}`;
  return (
    <LoopGuard className="relative isolate mx-auto h-[440px] w-full max-w-[500px] sm:h-[520px]">
      <StageBackdrop />

      {audience === "doctor" && (
        <div className="float-gentle absolute left-1/2 top-0 -translate-x-1/2">
          <div className="origin-top scale-[.84] sm:scale-100">
            <PhoneFrame>
              <MiniProfile doctor={doctor} />
            </PhoneFrame>
          </div>
        </div>
      )}
      {audience !== "doctor" && site && (
        <>
          <div className="absolute inset-x-0 top-8 pr-6 sm:top-6 sm:pr-10">
            <LaptopFrame url={url}>
              <MiniSiteLaptop site={site} />
            </LaptopFrame>
          </div>
          {audience === "clinic" && (
            <div className="float-gentle absolute bottom-4 right-0 sm:bottom-2">
              <PhoneFrame scale={0.5}>
                <MiniSitePhone site={site} />
              </PhoneFrame>
            </div>
          )}
        </>
      )}

      {/* The visiting card overlapping the device is rendered once by HeroAudience (same on every tab). */}

      {audience === "hospital" ? (
        <FloatChip icon={Siren} className="right-0 top-0" delay={0.4}>
          24×7 Emergency
        </FloatChip>
      ) : (
        <FloatChip icon={Clock} className="right-0 top-2 sm:right-2" delay={0.4}>
          <span className="size-1.5 rounded-full bg-leaf" /> {HERO.chips.open}
        </FloatChip>
      )}
      <FloatChip icon={Navigation} className={audience === "doctor" ? "-left-1 top-[34%] sm:left-0" : "left-0 top-0"} delay={1.6}>
        {HERO.chips.directions}
      </FloatChip>
      <FloatChip icon={UserPlus} className="bottom-[42%] right-0 hidden sm:inline-flex" delay={2.4}>
        {HERO.chips.save}
      </FloatChip>
      <FloatChip icon={Link2} className="bottom-0 right-2 sm:right-6" delay={0.9}>
        {url}
      </FloatChip>
    </LoopGuard>
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
// Visiting card spotlight extras (§4.7)
// ---------------------------------------------------------------------------

/** Generic chat bubble sharing the card link (no WhatsApp logo inside the illustration). */
export function ChatShare({ doctor, url }: { doctor: PublicDoctor; url: string }) {
  return (
    <div aria-hidden className="w-[250px] overflow-hidden rounded-2xl bg-[#efe9df] shadow-lift ring-1 ring-line">
      <div className="flex items-center gap-2 bg-ink px-3 py-2 text-paper">
        <span className="flex size-7 items-center justify-center rounded-full bg-sage text-[11px] font-semibold text-ink">P</span>
        <span className="text-sm font-semibold">Patient</span>
      </div>
      <div className="p-3">
        <div className="ml-auto w-[88%] rounded-xl rounded-tr-sm bg-[#d9f2d0] p-2 text-[12px] text-body shadow-sm">
          <div className="flex items-center gap-2 rounded-lg bg-white/70 p-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-ink">
              <Bookmark className="size-4 text-marigold" strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold text-ink">{doctor.fullName}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{url}</span>
            </span>
          </div>
          <p className="mt-1.5">{CARD_SPOTLIGHT.chat.message}</p>
          <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
            {CARD_SPOTLIGHT.chat.sent} <CheckCheck className="size-3 text-[#3b82c4]" strokeWidth={2.25} />
          </p>
        </div>
      </div>
    </div>
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

// ---------------------------------------------------------------------------
// Sample gallery item (§4.12)
// ---------------------------------------------------------------------------

export function GalleryItem({ label, href, open, badge, children }: { label: string; href: string; open: string; badge: string; children: ReactNode }) {
  return (
    <li className="relative flex shrink-0 snap-start flex-col items-center gap-3">
      <PhoneFrame scale={0.85} badge={badge}>
        {children}
      </PhoneFrame>
      <p className="font-medium text-body">{label}</p>
      <Link href={href} className="font-semibold text-lagoon hover:text-ink">
        {open} <span aria-hidden>→</span>
        <span className="sr-only">: {label}</span>
      </Link>
    </li>
  );
}

