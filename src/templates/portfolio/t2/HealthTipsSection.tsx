"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Clock, X } from "lucide-react";
import type { PublicHealthTip } from "@/templates/types";

/**
 * Health tips: general articles (content/health-tips.ts) as two equal cards
 * that open the full text in a reading dialog. No author line: they are not
 * written by the doctor. The text is rendered into the page (inside closed
 * dialogs), so it stays crawlable; #tip-{slug} opens one directly.
 */
export function HealthTipsSection({ tips }: { tips: PublicHealthTip[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLDialogElement | null>>({});

  useEffect(() => {
    const fromHash = () => {
      const slug = window.location.hash.match(/^#tip-(.+)$/)?.[1];
      if (slug && tips.some((t) => t.slug === slug)) setOpen(slug);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [tips]);

  useEffect(() => {
    for (const [slug, el] of Object.entries(refs.current)) {
      if (!el) continue;
      if (slug === open && !el.open) el.showModal();
      if (slug !== open && el.open) el.close();
    }
  }, [open]);

  const close = () => {
    setOpen(null);
    if (window.location.hash.startsWith("#tip-")) history.replaceState(history.state, "", window.location.pathname + window.location.search + "#health-tips");
  };

  return (
    <>
      <ul className="mt-12 grid gap-6 md:grid-cols-2">
        {tips.map((t, i) => (
          <li key={t.slug} className="cm-reveal" style={{ ["--cm-delay" as string]: `${i * 120}ms` }}>
            <a
              href={`#tip-${t.slug}`}
              onClick={(e) => {
                e.preventDefault();
                setOpen(t.slug);
              }}
              className="group flex h-full flex-col overflow-hidden rounded-[28px] bg-white shadow-cm ring-1 ring-cm-line transition duration-300 hover:-translate-y-1 hover:shadow-cm-lg"
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-cm-sky">
                <Image src={t.cover.url} alt={t.cover.alt} fill sizes="(min-width: 768px) 600px, 100vw" className="object-cover transition duration-700 group-hover:scale-105" />
                <span className="absolute left-5 top-5 rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cm-teal-2 backdrop-blur">{t.topic}</span>
              </div>
              <div className="flex flex-1 flex-col p-6 sm:p-7">
                <h3 className="text-xl font-extrabold leading-snug text-cm-navy group-hover:text-cm-teal sm:text-2xl">{t.title}</h3>
                <p className="mt-2 text-cm-muted">{t.excerpt}</p>
                <span className="mt-auto flex items-center justify-between pt-5 text-sm font-semibold">
                  <span className="inline-flex items-center gap-1.5 text-cm-muted">
                    <Clock aria-hidden className="size-4" /> {t.readMinutes} min read
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-cm-teal">
                    Read <ArrowRight aria-hidden className="size-4 transition group-hover:translate-x-1" />
                  </span>
                </span>
              </div>
            </a>
          </li>
        ))}
      </ul>

      {tips.map((t) => (
        <dialog
          key={t.slug}
          ref={(el) => {
            refs.current[t.slug] = el;
          }}
          onClose={() => open === t.slug && close()}
          onClick={(e) => e.target === e.currentTarget && close()}
          aria-labelledby={`tip-title-${t.slug}`}
          className="m-auto max-h-[92dvh] w-[min(720px,94vw)] overflow-y-auto rounded-3xl bg-white p-0 text-cm-text shadow-cm-lg backdrop:bg-cm-navy/70 backdrop:backdrop-blur-sm"
        >
          <article>
            <div className="relative aspect-[16/7] w-full bg-cm-sky">
              <Image src={t.cover.url} alt={t.cover.alt} fill sizes="720px" className="object-cover" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-cm-navy/50 to-transparent" />
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/90 text-cm-navy shadow-cm transition hover:bg-white"
            >
              <X className="size-5" strokeWidth={2} />
            </button>
            <div className="px-6 pb-10 pt-7 sm:px-10">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-cm-teal">
                {t.topic} · {t.readMinutes} min read
              </p>
              <h3 id={`tip-title-${t.slug}`} className="mt-3 text-2xl font-extrabold leading-tight text-cm-navy sm:text-[30px]">
                {t.title}
              </h3>
              <div className="cm-blog-body mt-6 text-[17px] leading-[1.8] text-cm-text/90">
                {t.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <p className="mt-8 rounded-2xl bg-cm-sky px-5 py-4 text-sm text-cm-muted">
                General health information only. It is not medical advice for your own condition; please consult a doctor for that.
              </p>
            </div>
          </article>
        </dialog>
      ))}
    </>
  );
}
