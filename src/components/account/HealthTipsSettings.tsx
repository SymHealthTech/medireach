"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Check, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { saveHealthTipsAction } from "@/app/account/actions";
import { SwitchField } from "@/components/admin/form/fields";
import { cn } from "@/lib/cn";

export interface TipOption {
  slug: string;
  title: string;
  excerpt: string;
  topic: string;
  cover: string;
}

/**
 * The doctor's Health tips section: on or off, and which two general articles
 * it shows (automatic by specialty, or chosen). In `demo` mode nothing is
 * saved (the sample dashboard shown to doctors).
 */
export function HealthTipsSettings({
  initial,
  options,
  autoPicks,
  demo,
}: {
  initial: { show: boolean; slugs: string[] };
  /** Tips that suit the doctor, best matches first. */
  options: TipOption[];
  /** What "automatic" shows now. */
  autoPicks: string[];
  demo?: boolean;
}) {
  const [show, setShow] = useState(initial.show);
  const [mode, setMode] = useState<"auto" | "choose">(initial.slugs.length ? "choose" : "auto");
  const [slugs, setSlugs] = useState<string[]>(initial.slugs.length ? initial.slugs : autoPicks);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const toggle = (slug: string) => {
    setMessage(null);
    setSlugs((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : s.length >= 2 ? [s[1]!, slug] : [...s, slug]));
  };
  const shown = mode === "auto" ? autoPicks : slugs;

  const save = () =>
    start(async () => {
      if (demo) {
        setMessage({ ok: true, text: "Demo: on a real account this updates the website straight away." });
        return;
      }
      const res = await saveHealthTipsAction({ show, slugs: mode === "auto" ? [] : slugs });
      setMessage(res.ok ? { ok: true, text: "Saved. Your website is updated." } : { ok: false, text: res.error });
    });

  return (
    <div className="space-y-5">
      <section className="space-y-4 rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-6">
        <SwitchField
          label="Show the Health tips section on my website"
          description="Two short, general health articles for patients' information. They are not shown with your name."
          checked={show}
          onCheckedChange={(v) => {
            setShow(v);
            setMessage(null);
          }}
        />
        {show && (
          <div role="radiogroup" aria-label="Which tips" className="grid gap-3 sm:grid-cols-2">
            {(
              [
                { key: "auto", title: "Choose for me", text: "Picked to suit your specialty." },
                { key: "choose", title: "I'll choose", text: "Pick any two from the list below." },
              ] as const
            ).map((o) => (
              <button
                key={o.key}
                type="button"
                role="radio"
                aria-checked={mode === o.key}
                onClick={() => {
                  setMode(o.key);
                  setMessage(null);
                }}
                className={cn("rounded-xl border-2 p-4 text-left transition", mode === o.key ? "border-lagoon bg-mist" : "border-line hover:border-ink/30")}
              >
                <span className="flex items-center gap-2 font-semibold text-ink">
                  {o.key === "auto" && <Sparkles aria-hidden className="size-4 text-lagoon" />}
                  {o.title}
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{o.text}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {show && (
        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-ink">{mode === "auto" ? "Shown on your website now" : `Choose two (${slugs.length}/2)`}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {(mode === "auto" ? options.filter((o) => autoPicks.includes(o.slug)) : options).map((o) => {
              const on = shown.includes(o.slug);
              const Tag = mode === "choose" ? "button" : "div";
              return (
                <li key={o.slug}>
                  <Tag
                    {...(mode === "choose" ? { type: "button" as const, onClick: () => toggle(o.slug), "aria-pressed": on } : {})}
                    className={cn(
                      "flex h-full w-full gap-3 rounded-2xl border bg-surface p-3 text-left shadow-soft transition",
                      on ? "border-lagoon ring-2 ring-lagoon/30" : "border-line",
                      mode === "choose" && "hover:border-ink/30",
                    )}
                  >
                    <span className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-mist">
                      <Image src={o.cover} alt="" fill sizes="96px" className="object-cover" />
                      {on && (
                        <span className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-lagoon text-white">
                          <Check aria-hidden className="size-4" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-lagoon">{o.topic}</span>
                      <span className="block font-semibold leading-snug text-ink">{o.title}</span>
                      <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{o.excerpt}</span>
                    </span>
                  </Tag>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={save}
          disabled={pending || (show && mode === "choose" && slugs.length !== 2)}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-ink px-6 font-semibold text-paper hover:bg-ink-700 disabled:opacity-50"
        >
          {pending && <Loader2 className="size-4 animate-spin" />} Save
        </button>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "flex items-center gap-1.5 text-sm text-leaf-text" : "text-sm text-clay-text"}>
            {message.ok && <CheckCircle2 className="size-4" />} {message.text}
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">These articles are general information only, written for patients in plain language. They are the same kind of content on every MediReach site and never claim to be written by you.</p>
    </div>
  );
}
