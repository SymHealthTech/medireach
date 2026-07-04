"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/cn";

export interface FieldKeyword {
  keyword: string;
  expansion: string;
}

/**
 * A text field (single- or multi-line) that expands the doctor's per-field
 * keyword shortcuts (Edit Keyword, spec §9.5) inline. As the doctor types, the
 * last word is matched against this field's shortcuts; picking one replaces the
 * word with its full expansion — the same mental model as the medicine brand
 * autocomplete, applied to every other consultation field.
 */
export function KeywordText({
  value,
  onChange,
  keywords,
  multiline,
  className,
  id,
  placeholder,
  rows = 1,
  inputMode,
  autoGrow,
}: {
  value: string;
  onChange: (v: string) => void;
  keywords: FieldKeyword[];
  multiline?: boolean;
  className?: string;
  id?: string;
  placeholder?: string;
  rows?: number;
  inputMode?: "text" | "numeric";
  autoGrow?: boolean;
}) {
  const [matches, setMatches] = useState<FieldKeyword[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Keep an auto-growing textarea sized to its content, including after a
  // programmatic keyword expansion.
  useEffect(() => {
    if (multiline && autoGrow && areaRef.current) {
      areaRef.current.style.height = "auto";
      areaRef.current.style.height = areaRef.current.scrollHeight + "px";
    }
  }, [value, multiline, autoGrow]);

  function lastToken(v: string): string {
    const m = v.match(/[^\s]*$/);
    return m ? m[0] : "";
  }

  function update(v: string) {
    onChange(v);
    if (!keywords.length) return;
    const tok = lastToken(v).toLowerCase();
    if (!tok) {
      setOpen(false);
      return;
    }
    const found = keywords.filter((k) => k.keyword.toLowerCase().startsWith(tok)).slice(0, 8);
    setMatches(found);
    setActive(0);
    setOpen(found.length > 0);
  }

  function pick(k: FieldKeyword) {
    const tok = lastToken(value);
    const base = value.slice(0, value.length - tok.length);
    onChange(base + k.expansion);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + matches.length) % matches.length);
    } else if ((e.key === "Enter" && !multiline) || e.key === "Tab") {
      const chosen = matches[active];
      if (chosen) {
        e.preventDefault();
        pick(chosen);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      {multiline ? (
        <Textarea
          ref={areaRef}
          id={id}
          value={value}
          placeholder={placeholder}
          rows={rows}
          className={className}
          onChange={(e) => update(e.target.value)}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />
      ) : (
        <Input
          id={id}
          value={value}
          placeholder={placeholder}
          inputMode={inputMode}
          className={className}
          onChange={(e) => update(e.target.value)}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />
      )}

      {open && matches.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-line bg-surface shadow-lg">
          {matches.map((k, i) => (
            <li
              key={k.keyword}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(k);
              }}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-2 px-3 py-2",
                i === active ? "bg-surface-raised" : "hover:bg-surface-raised",
              )}
            >
              <div className="min-w-0">
                <p className="font-mono text-sm font-semibold text-brand">{k.keyword}</p>
                <p className="truncate text-[11px] text-ink-muted">{k.expansion}</p>
              </div>
              <span className="shrink-0 rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                Shortcut
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
