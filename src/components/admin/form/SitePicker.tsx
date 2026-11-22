"use client";

import { useId, useState } from "react";
import { Building2, Hospital, Plus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { EstablishmentKind } from "@/lib/constants";

export interface SiteOption {
  id: string;
  name: string;
  kind: EstablishmentKind;
}

const SHOWN = 8;

/**
 * Pick clinic and hospital sites by searching (instead of listing every site):
 * type part of a name, tap a result to add it. Chosen sites show as chips;
 * `locked` ones (linked elsewhere) can't be removed here.
 */
export function SitePicker({
  options,
  value,
  locked = [],
  onChange,
  disabled,
  max = 20,
}: {
  options: SiteOption[];
  value: string[];
  locked?: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  max?: number;
}) {
  const id = useId();
  const [q, setQ] = useState("");
  const chosen = new Set([...value, ...locked]);
  const byId = new Map(options.map((o) => [o.id, o]));
  const term = q.trim().toLowerCase();
  const matches = term ? options.filter((o) => !chosen.has(o.id) && o.name.toLowerCase().includes(term)) : [];
  const full = chosen.size >= max;

  const add = (siteId: string) => {
    onChange([...value, siteId]);
    setQ("");
  };

  return (
    <div className="space-y-3">
      {chosen.size > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Linked sites">
          {[...chosen].map((sid) => {
            const o = byId.get(sid);
            const isLocked = locked.includes(sid);
            return (
              <li key={sid} className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-line bg-card py-1 pl-3 pr-1 text-sm">
                {o?.kind === "hospital" ? <Hospital className="size-3.5 shrink-0 text-muted-foreground" aria-hidden /> : <Building2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
                <span className="truncate font-medium text-ink">{o?.name ?? "Removed site"}</span>
                {isLocked ? (
                  <span className="pr-2 text-xs text-muted-foreground">from Clinics step</span>
                ) : (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(value.filter((x) => x !== sid))}
                    aria-label={`Remove ${o?.name ?? "site"}`}
                    className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-ink disabled:opacity-50"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Not linked to any clinic or hospital yet.</p>
      )}

      <div className="relative">
        <label htmlFor={id} className="sr-only">
          Search clinics and hospitals
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          id={id}
          value={q}
          disabled={disabled || full}
          placeholder={full ? `Up to ${max} sites` : "Search a clinic or hospital by name"}
          autoComplete="off"
          className="pl-9"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (matches[0]) add(matches[0].id);
            }
            if (e.key === "Escape") setQ("");
          }}
        />
      </div>

      {term && (
        <ul className="overflow-hidden rounded-lg border border-line bg-card" aria-label="Search results">
          {matches.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">No site matches “{q.trim()}”.</li>
          ) : (
            matches.slice(0, SHOWN).map((o) => (
              <li key={o.id} className="border-t border-line first:border-t-0">
                <button type="button" disabled={disabled} onClick={() => add(o.id)} className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm hover:bg-accent">
                  <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-medium text-ink">{o.name}</span>
                  <span className="text-xs text-muted-foreground">{o.kind === "hospital" ? "Hospital" : "Clinic"}</span>
                </button>
              </li>
            ))
          )}
          {matches.length > SHOWN && <li className="border-t border-line px-3 py-2 text-xs text-muted-foreground">{matches.length - SHOWN} more: type more of the name.</li>}
        </ul>
      )}
    </div>
  );
}
