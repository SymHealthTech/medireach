"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Apple,
  ArrowLeft,
  ArrowRight,
  Baby,
  Bone,
  Brain,
  ClipboardCheck,
  Droplet,
  Eye,
  HeartPulse,
  House,
  Pill,
  Smile,
  Sparkles,
  Stethoscope,
  Syringe,
  Thermometer,
  Users,
  Wind,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { ServiceIcon } from "@/content/service-descriptions";

const ICONS: Record<ServiceIcon, typeof Stethoscope> = {
  stethoscope: Stethoscope,
  droplet: Droplet,
  heart: HeartPulse,
  syringe: Syringe,
  clipboard: ClipboardCheck,
  thermometer: Thermometer,
  apple: Apple,
  users: Users,
  activity: Activity,
  baby: Baby,
  bone: Bone,
  eye: Eye,
  smile: Smile,
  brain: Brain,
  wind: Wind,
  sparkles: Sparkles,
  home: House,
  pill: Pill,
};

/**
 * Modern Edge services: a horizontal rail of tall cards (scroll-snap, swipe
 * on phones, arrow buttons and a progress line on larger screens). Each card
 * turns cobalt on hover. Icon names come in as strings (server → client).
 */
export function ServicesRail({ services }: { services: { name: string; text: string; icon: ServiceIcon }[] }) {
  const rail = useRef<HTMLUListElement>(null);
  const [progress, setProgress] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollWidth - el.clientWidth;
      setProgress(max > 0 ? el.scrollLeft / max : 1);
      setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft > max - 8 });
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const step = (dir: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    const card = el.querySelector("li");
    el.scrollBy({
      left: dir * ((card?.clientWidth ?? 320) + 20),
      behavior: "smooth",
    });
  };

  return (
    <div>
      <ul
        ref={rail}
        className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-4 pb-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
        aria-label="Services"
      >
        {services.map((s, i) => {
          const Icon = ICONS[s.icon];
          return (
            <li
              key={s.name}
              className="cm-reveal group relative flex min-h-[360px] w-[78vw] max-w-[320px] shrink-0 snap-start flex-col overflow-hidden bg-white p-7 ring-1 ring-me-line transition-colors duration-500 hover:bg-me-cobalt sm:w-[300px]"
              style={{ ["--cm-delay" as string]: `${Math.min(i, 4) * 80}ms` }}
            >
              <span aria-hidden className="absolute -right-3 -top-6 text-[120px] font-bold leading-none text-me-steel transition-colors duration-500 group-hover:text-white/10">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="relative flex size-14 items-center justify-center bg-me-ink text-white transition-colors duration-500 group-hover:bg-me-orange">
                <Icon aria-hidden className="size-7" strokeWidth={1.6} />
              </span>
              <h3 className="relative mt-auto pt-10 text-xl font-bold uppercase leading-tight tracking-tight text-me-ink transition-colors duration-500 group-hover:text-white">
                {s.name}
              </h3>
              <p className="relative mt-3 text-[15px] leading-relaxed text-me-muted transition-colors duration-500 group-hover:text-white/80">{s.text}</p>
              <span aria-hidden className="relative mt-6 block h-[3px] w-12 bg-me-orange transition-all duration-500 group-hover:w-full group-hover:bg-white" />
            </li>
          );
        })}
      </ul>
      <div className="mt-6 flex items-center gap-6">
        <div className="relative h-[3px] flex-1 bg-me-line" aria-hidden>
          <span className="absolute inset-y-0 left-0 bg-me-ink transition-[width] duration-300" style={{ width: `${Math.max(8, progress * 100)}%` }} />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={edges.start}
            aria-label="Previous services"
            className={cn(
              "flex size-12 items-center justify-center ring-1 ring-me-line transition hover:bg-me-ink hover:text-white disabled:pointer-events-none disabled:opacity-30",
            )}
          >
            <ArrowLeft aria-hidden className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={edges.end}
            aria-label="More services"
            className="flex size-12 items-center justify-center bg-me-orange text-white transition hover:bg-me-orange-2 disabled:pointer-events-none disabled:opacity-30"
          >
            <ArrowRight aria-hidden className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
