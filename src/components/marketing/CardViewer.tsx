"use client";

import { ExternalLink, Expand, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { VISITING_CARDS } from "@/content/marketing";
import { cn } from "@/lib/cn";

/**
 * Visiting card gallery item: the card that comes with one website design.
 * The small preview and "View full card" open a full-screen viewer with the
 * phone and print cards (server-rendered, passed in) and a link to the design.
 */
export function CardViewer({
  name,
  subtitle,
  swatches,
  preview,
  phone,
  print,
  designHref,
}: {
  name: string;
  subtitle: string;
  /** Three colours of the design, shown next to its name. */
  swatches: readonly string[];
  preview: ReactNode;
  phone: ReactNode;
  print: ReactNode;
  /** The design's sample website. */
  designHref: string;
}) {
  const [face, setFace] = useState<"phone" | "print">("phone");
  const C = VISITING_CARDS;
  const tab = (active: boolean) =>
    cn("inline-flex min-h-9 items-center rounded-full px-4 text-sm font-semibold transition", active ? "bg-white text-ink shadow-soft" : "text-white/80 hover:text-white");

  return (
    <DialogPrimitive.Root onOpenChange={(open) => open && setFace("phone")}>
      <DialogPrimitive.Trigger asChild>
        <button type="button" aria-label={`${C.view}: ${name}`} className="group relative block w-full rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
          <span aria-hidden className="pointer-events-none block">
            {preview}
          </span>
          <span
            aria-hidden
            className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-white/90 text-ink opacity-0 shadow-soft transition group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <Expand className="size-4" strokeWidth={2} />
          </span>
        </button>
      </DialogPrimitive.Trigger>

      <div className="mt-2 flex justify-between px-1 text-xs text-muted-foreground" aria-hidden>
        <span>{C.phoneLabel}</span>
        <span>{C.printLabel}</span>
      </div>

      <div className="mt-4 min-w-0">
        <h3 className="font-display text-xl font-semibold text-ink">{name}</h3>
        <p className="flex items-center gap-2 text-sm text-body/80">
          <span className="flex shrink-0 -space-x-1" aria-hidden>
            {swatches.map((c, i) => (
              <span key={i} className="size-4 rounded-full border-2 border-white shadow-sm" style={{ background: c }} />
            ))}
          </span>
          {subtitle}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <DialogPrimitive.Trigger asChild>
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-marigold px-5 font-semibold text-white transition-colors hover:bg-marigold-700 active:scale-[.98]"
          >
            <Expand aria-hidden className="size-4" strokeWidth={2} /> {C.view}
          </button>
        </DialogPrimitive.Trigger>
        <a
          href={designHref}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-lagoon/40 px-5 font-semibold text-lagoon transition-colors hover:bg-lagoon/5"
        >
          {C.seeDesign} <ExternalLink aria-hidden className="size-4" strokeWidth={2} />
        </a>
      </div>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#062A2A]/95 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col text-white outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {/* Top bar: name, close */}
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="truncate font-display text-lg font-semibold sm:text-xl">{name}</DialogPrimitive.Title>
              <p className="truncate text-sm text-white/70">{subtitle}</p>
            </div>
            <DialogPrimitive.Close className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20" aria-label={C.close}>
              <X className="size-5" strokeWidth={2} />
            </DialogPrimitive.Close>
          </div>

          {/* Phone / print switch */}
          <div className="flex justify-center px-4">
            <div role="tablist" aria-label={C.view} className="flex rounded-full bg-white/10 p-1">
              <button type="button" role="tab" aria-selected={face === "phone"} onClick={() => setFace("phone")} className={tab(face === "phone")}>
                {C.phoneLabel}
              </button>
              <button type="button" role="tab" aria-selected={face === "print"} onClick={() => setFace("print")} className={tab(face === "print")}>
                {C.printLabel}
              </button>
            </div>
          </div>

          {/* The card, as large as the screen allows */}
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto px-4 py-4">
            {face === "phone" ? (
              <div className="w-[min(88vw,calc((100dvh-240px)*0.5625),460px)] overflow-hidden rounded-2xl shadow-2xl">{phone}</div>
            ) : (
              <div className="w-[min(92vw,calc((100dvh-240px)*1.545),960px)] overflow-hidden rounded-xl shadow-2xl">{print}</div>
            )}
          </div>

          {/* Note + the design */}
          <div className="border-t border-white/10 bg-black/20 px-4 py-3 sm:px-6">
            <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-3 sm:justify-between">
              <p className="text-sm text-white/75">{C.sampleNote}</p>
              <a
                href={designHref}
                target="_blank"
                rel="noopener"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-marigold px-6 font-semibold text-white transition-colors hover:bg-marigold-700 active:scale-[.98] sm:w-auto"
              >
                {C.seeDesign} <ExternalLink aria-hidden className="size-4" strokeWidth={2} />
              </a>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
