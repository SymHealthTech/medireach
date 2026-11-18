"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { ThemeMiniPreview } from "@/components/public/ThemeMiniPreview";
import { SPECIALTY_THEMES, type ThemeKey } from "@/themes/specialty";

/** Grid of specialty theme swatches (DESIGN_BRIEF.md §6 "Theme picker"). */
export function ThemePicker({
  value,
  onChange,
  disabled,
  siteName,
  recommended,
}: {
  value: ThemeKey;
  onChange: (key: ThemeKey) => void;
  disabled?: boolean;
  siteName?: string;
  /** The category's default theme, marked "Suggested". */
  recommended?: ThemeKey;
}) {
  return (
    <div role="radiogroup" aria-label="Specialty design" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {SPECIALTY_THEMES.map((theme) => {
        const selected = theme.key === value;
        return (
          <button
            key={theme.key}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(theme.key)}
            className={cn(
              "relative space-y-2 rounded-xl border bg-card p-2 text-left transition hover:-translate-y-0.5 hover:shadow-soft disabled:opacity-60",
              selected ? "border-ink ring-2 ring-ink" : "border-line",
            )}
          >
            <ThemeMiniPreview theme={theme} name={selected ? siteName : undefined} />
            <span className="flex items-center justify-between gap-1">
              <span className="truncate text-sm font-semibold text-ink">{theme.name}</span>
              {selected && <Check className="size-4 shrink-0 text-ink" />}
            </span>
            <span className="flex gap-1">
              {[theme.palette.primary, theme.palette.accent, theme.palette.soft].map((c) => (
                <span key={c} className="size-3 rounded-full border border-black/10" style={{ background: c }} />
              ))}
              {recommended === theme.key && <span className="ml-auto text-[11px] font-semibold text-leaf-text">Suggested</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
