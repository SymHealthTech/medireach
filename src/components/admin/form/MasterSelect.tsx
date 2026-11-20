"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, ClipboardList, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { quickAddMasterAction } from "@/app/admin/(dash)/masters/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "./fields";

/**
 * A master-list dropdown (council, degree, specialty, area, category) that
 * never leaves the admin stuck: "Other: not in the list" adds a new entry on
 * the spot, and when the website form ("Get started") had an answer, it is
 * shown under the empty dropdown with "Use this".
 */

export type MasterKind = "council" | "degree" | "specialty" | "area" | "category";
export interface MasterOption {
  id: string;
  name: string;
}
export interface MasterScope {
  cityId?: string;
  establishmentKind?: "clinic" | "hospital";
  themeKey?: string;
}

const ADD = "__add";

// Entries added on this page, shared by every dropdown of the same list (e.g. all qualification rows).
const added = new Map<string, MasterOption[]>();
const listeners = new Set<() => void>();
let version = 0;
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const scopeKey = (kind: MasterKind, scope: MasterScope = {}) => `${kind}:${scope.cityId ?? scope.establishmentKind ?? ""}`;
function remember(kind: MasterKind, scope: MasterScope | undefined, o: MasterOption) {
  const k = scopeKey(kind, scope);
  const list = added.get(k) ?? [];
  if (!list.some((x) => x.id === o.id)) added.set(k, [...list, o]);
  version++;
  listeners.forEach((l) => l());
}

/** The server's list plus anything added on this page. */
export function useMasterOptions(kind: MasterKind, base: MasterOption[], scope?: MasterScope): MasterOption[] {
  useSyncExternalStore(subscribe, () => version, () => 0);
  const extra = (added.get(scopeKey(kind, scope)) ?? []).filter((o) => !base.some((b) => b.id === o.id));
  return extra.length ? [...base, ...extra].sort((a, b) => a.name.localeCompare(b.name)) : base;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Find or add an entry by name. Returns the option, or null (the error is shown as a toast). */
export async function addMaster(kind: MasterKind, name: string, scope?: MasterScope, existing: MasterOption[] = []): Promise<MasterOption | null> {
  const hit = existing.find((o) => same(o.name, name));
  if (hit) return hit;
  const r = await quickAddMasterAction({ kind, name, ...scope });
  if (!r.ok) {
    toast.error(r.error);
    return null;
  }
  remember(kind, scope, r.data);
  return r.data;
}

export function MasterSelect({
  id,
  kind,
  value,
  options: base,
  onChange,
  disabled,
  invalid,
  scope,
  hint,
  noun,
}: {
  id: string;
  kind: MasterKind;
  value: string;
  options: MasterOption[];
  onChange: (id: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  /** Areas: the city. Categories: clinic or hospital (and the design new sites start with). */
  scope?: MasterScope;
  /** What the website form said, offered while the dropdown is empty. */
  hint?: string;
  /** "council", "degree"…, for the add box. */
  noun: string;
}) {
  const options = useMasterOptions(kind, base, scope);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const blocked = disabled || (kind === "area" && !scope?.cityId);

  async function add(text: string) {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const o = await addMaster(kind, text, scope, options);
      if (!o) return;
      onChange(o.id);
      setAdding(false);
      setName("");
      if (!base.some((b) => b.id === o.id)) toast.success(`Added “${o.name}”.`);
    } finally {
      setBusy(false);
    }
  }

  const hintText = hint?.trim();
  const hintMatch = hintText ? options.find((o) => same(o.name, hintText)) : undefined;

  return (
    <div className="space-y-2">
      <NativeSelect
        id={id}
        value={adding ? ADD : value}
        disabled={blocked}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          if (e.target.value === ADD) {
            setAdding(true);
            setName(hintText && !hintMatch ? hintText : "");
          } else {
            setAdding(false);
            onChange(e.target.value);
          }
        }}
      >
        <option value="" />
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
        <option value={ADD}>+ Other: not in the list…</option>
      </NativeSelect>

      {adding && (
        <div className="flex gap-2">
          <Input
            autoFocus
            aria-label={`New ${noun}`}
            placeholder={`Type the ${noun} name`}
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void add(name);
              } else if (e.key === "Escape") setAdding(false);
            }}
          />
          <Button type="button" onClick={() => void add(name)} disabled={busy || !name.trim()}>
            {busy ? <Loader2 className="animate-spin" /> : <Plus />} Add
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Cancel" onClick={() => setAdding(false)}>
            <X />
          </Button>
        </div>
      )}

      {!value && !adding && hintText && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-sage/60 px-3 py-2 text-xs text-ink">
          <ClipboardList className="size-3.5 shrink-0" aria-hidden />
          <span>
            Website form: <strong>{hintText}</strong>
            {!hintMatch && <span className="text-muted-foreground"> (not in the list yet)</span>}
          </span>
          <button
            type="button"
            disabled={blocked || busy}
            onClick={() => void add(hintText)}
            className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />} {hintMatch ? "Use this" : "Add and use"}
          </button>
        </p>
      )}
    </div>
  );
}
