"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/cn";
import { apiGet, apiPost } from "@/lib/client/api";
import { SelectOrAdd, saveCustomOption, type CustomOptions } from "@/components/app/SelectOrAdd";
import {
  KEYWORD_FIELDS,
  MEDICINE_TYPES,
  MEDICINE_DOSES,
  MEDICINE_FREQUENCIES,
  MEDICINE_TIMINGS,
  type KeywordField,
  type MedicineSource,
} from "@/lib/constants";

interface KeywordMedicine {
  type?: string;
  name?: string;
  generic?: string;
  dose?: string;
  frequency?: string;
  timing?: string;
  source?: MedicineSource;
}

interface Keyword {
  id: string;
  field: KeywordField;
  keyword: string;
  expansion: string;
  medicine?: KeywordMedicine;
}

// Builds the "Tab. Paracetamol (500mg) — 1 BD After food" clinical line stored
// as `expansion`, mirroring the MedicineEditor so the AI dictionary and the
// consult autofill stay consistent.
function medClinicalText(m: KeywordMedicine): string {
  const label = `${m.type ? m.type + ". " : ""}${m.name ?? ""}${m.generic ? ` (${m.generic})` : ""}`.trim();
  const instr = [m.dose, m.frequency, m.timing].filter(Boolean).join(" ");
  return `${label}${instr ? ` — ${instr}` : ""}`.trim();
}

/**
 * Edit Keyword (spec §9.5, §12) — the doctor's personal shorthand dictionary,
 * organised per consultation field. Each field is a collapsible section: expand
 * it to add shortcuts and see the ones already saved. `medicine` shortcuts
 * capture every medicine sub-field and auto-fill them on the consult screen; the
 * rest expand into free text.
 */
export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [openField, setOpenField] = useState<KeywordField | null>(null);

  const load = useCallback(async () => {
    const data = await apiGet<{ keywords: Keyword[] }>("/api/keywords").catch(() => ({ keywords: [] }));
    setKeywords(data.keywords);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byField = useMemo(() => {
    const map = new Map<KeywordField, Keyword[]>();
    for (const f of KEYWORD_FIELDS) map.set(f.key, []);
    for (const k of keywords) {
      const arr = map.get(k.field);
      if (arr) arr.push(k);
      else map.set(k.field, [k]);
    }
    return map;
  }, [keywords]);

  if (loading) return <KeywordsSkeleton />;

  const total = keywords.length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Edit Keyword"
        subtitle={
          <>
            Personal shorthand for each field, expanded automatically as you type on the consultation
            screen. e.g. type <span className="rounded bg-line/60 px-1 font-mono text-[13px] text-ink">p5</span> in a
            medicine to fill <span className="text-ink">Tab. Paracetamol 500mg</span>.
          </>
        }
      />

      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <span className="rounded-full bg-brand/10 px-2.5 py-1 font-semibold text-brand">
          {total} shortcut{total === 1 ? "" : "s"}
        </span>
        <span>across {KEYWORD_FIELDS.length} fields</span>
      </div>

      <div className="space-y-2.5">
        {KEYWORD_FIELDS.map((meta) => (
          <CategoryCard
            key={meta.key}
            meta={meta}
            keywords={byField.get(meta.key) ?? []}
            open={openField === meta.key}
            onToggle={() => setOpenField((cur) => (cur === meta.key ? null : meta.key))}
            onChanged={load}
          />
        ))}
      </div>
    </div>
  );
}

// ── Category card ─────────────────────────────────────────────────────────────

function CategoryCard({
  meta,
  keywords,
  open,
  onToggle,
  onChanged,
}: {
  meta: (typeof KEYWORD_FIELDS)[number];
  keywords: Keyword[];
  open: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const isMedicine = meta.key === "medicine";
  const count = keywords.length;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-surface-raised shadow-card transition-colors dark:shadow-card-dark",
        open ? "border-brand/40 ring-1 ring-brand/20" : "border-line",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-line/20"
        aria-expanded={open}
      >
        <span
          className={cn(
            "flex h-10 min-w-[2.5rem] shrink-0 items-center justify-center whitespace-nowrap rounded-xl px-2 text-xs font-bold leading-none tracking-tight",
            open ? "bg-brand text-brand-fg" : "bg-brand/10 text-brand",
          )}
        >
          {meta.short}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-semibold text-ink">{meta.label}</span>
            {count > 0 && (
              <span className="rounded-full bg-line/70 px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
                {count}
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-[13px] text-ink-muted">{meta.hint}</span>
        </span>
        <span
          className={cn(
            "shrink-0 text-ink-muted transition-transform duration-200",
            open ? "rotate-180" : "",
          )}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-line px-4 pb-4 pt-4">
          {isMedicine ? (
            <MedicineKeywordForm onSaved={onChanged} />
          ) : (
            <TextKeywordForm field={meta.key} onSaved={onChanged} />
          )}

          {count === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-sm text-ink-muted">
              No shortcuts yet for {meta.label.toLowerCase()}.
            </p>
          ) : (
            <ul className="space-y-2">
              {keywords.map((k) =>
                isMedicine ? (
                  <MedicineKeywordRow key={k.id} kw={k} onChanged={onChanged} />
                ) : (
                  <TextKeywordRow key={k.id} kw={k} onChanged={onChanged} />
                ),
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ── Text keyword: add form ────────────────────────────────────────────────────

function TextKeywordForm({ field, onSaved }: { field: KeywordField; onSaved: () => void }) {
  const [keyword, setKeyword] = useState("");
  const [expansion, setExpansion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiPost("/api/keywords", { field, keyword, expansion });
      setKeyword("");
      setExpansion("");
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={add} className="space-y-3 rounded-xl border border-line bg-surface p-3.5">
      {error && <p className="text-sm text-sos">{error}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div>
          <Label htmlFor={`kw-${field}`}>Shortcut</Label>
          <Input
            id={`kw-${field}`}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g. dm2"
            required
          />
        </div>
        <div>
          <Label htmlFor={`ex-${field}`}>Expands to</Label>
          <Input
            id={`ex-${field}`}
            value={expansion}
            onChange={(e) => setExpansion(e.target.value)}
            placeholder="Full text to insert"
            required
          />
        </div>
      </div>
      <Button type="submit" variant="brand" disabled={busy || !keyword.trim() || !expansion.trim()}>
        {busy ? "Adding…" : "+ Add shortcut"}
      </Button>
    </form>
  );
}

// ── Text keyword: list row (inline edit) ──────────────────────────────────────

function TextKeywordRow({ kw, onChanged }: { kw: Keyword; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [keyword, setKeyword] = useState(kw.keyword);
  const [expansion, setExpansion] = useState(kw.expansion);

  async function save() {
    await fetch(`/api/keywords/${kw.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword, expansion }),
    });
    setEditing(false);
    onChanged();
  }

  async function remove() {
    await fetch(`/api/keywords/${kw.id}`, { method: "DELETE" });
    onChanged();
  }

  if (editing) {
    return (
      <li className="rounded-xl border border-line bg-surface p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Shortcut" />
          <Input value={expansion} onChange={(e) => setExpansion(e.target.value)} placeholder="Expands to" />
        </div>
        <div className="mt-2 flex gap-2">
          <Button type="button" size="sm" variant="brand" onClick={save}>Save</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
      <span className="shrink-0 rounded-lg bg-brand/10 px-2 py-1 font-mono text-[13px] font-semibold text-brand">
        {kw.keyword}
      </span>
      <span className="text-ink-muted" aria-hidden>→</span>
      <span className="min-w-0 flex-1 truncate text-sm text-ink">{kw.expansion}</span>
      <RowActions onEdit={() => setEditing(true)} onDelete={remove} />
    </li>
  );
}

// ── Medicine keyword: add form ────────────────────────────────────────────────

const emptyMed = {
  keyword: "",
  type: "Tab",
  name: "",
  generic: "",
  dose: "",
  frequency: "",
  timing: "",
  source: "pharmacy" as MedicineSource,
};
type MedDraft = typeof emptyMed;

function MedicineKeywordForm({ onSaved }: { onSaved: () => void }) {
  const [d, setD] = useState<MedDraft>(emptyMed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [custom, setCustom] = useState<CustomOptions>({ types: [], doses: [], frequencies: [], timings: [] });

  useEffect(() => {
    fetch("/api/medicine-options")
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => { if (c) setCustom(c as CustomOptions); })
      .catch(() => {});
  }, []);

  function set<K extends keyof MedDraft>(k: K, v: MedDraft[K]) {
    setD((prev) => ({ ...prev, [k]: v }));
  }

  function addCustom(category: keyof CustomOptions, value: string) {
    setCustom((prev) => ({
      ...prev,
      [category]: prev[category].includes(value) ? prev[category] : [...prev[category], value],
    }));
    saveCustomOption(category, value);
  }

  const preview = medClinicalText(d);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const medicine: KeywordMedicine = {
        type: d.type || undefined,
        name: d.name || undefined,
        generic: d.generic || undefined,
        dose: d.dose || undefined,
        frequency: d.frequency || undefined,
        timing: d.timing || undefined,
        source: d.source,
      };
      await apiPost("/api/keywords", {
        field: "medicine",
        keyword: d.keyword,
        expansion: medClinicalText(medicine) || d.name,
        medicine,
      });
      setD(emptyMed);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={add} className="space-y-3 rounded-xl border border-line bg-surface p-3.5">
      {error && <p className="text-sm text-sos">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div>
          <Label htmlFor="med-kw">Shortcut</Label>
          <Input
            id="med-kw"
            value={d.keyword}
            onChange={(e) => set("keyword", e.target.value)}
            placeholder="e.g. p5"
            required
          />
        </div>
        <div>
          <Label htmlFor="med-name">Brand name</Label>
          <Input
            id="med-name"
            value={d.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Paracetamol / Dolo"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MedSelect label="Type" value={d.type} options={[...(MEDICINE_TYPES as unknown as string[]), ...custom.types]} onChange={(v) => set("type", v)} onCustomAdded={(v) => addCustom("types", v)} />
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="med-generic">Contains</Label>
          <Input id="med-generic" value={d.generic} onChange={(e) => set("generic", e.target.value)} placeholder="e.g. 500mg" />
        </div>
        <MedSelect label="Dose" value={d.dose} options={[...(MEDICINE_DOSES as unknown as string[]), ...custom.doses]} onChange={(v) => set("dose", v)} onCustomAdded={(v) => addCustom("doses", v)} />
        <MedSelect label="Frequency" value={d.frequency} options={[...(MEDICINE_FREQUENCIES as unknown as string[]), ...custom.frequencies]} onChange={(v) => set("frequency", v)} onCustomAdded={(v) => addCustom("frequencies", v)} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <MedSelect label="Timing" value={d.timing} options={[...(MEDICINE_TIMINGS as unknown as string[]), ...custom.timings]} onChange={(v) => set("timing", v)} onCustomAdded={(v) => addCustom("timings", v)} />
        <div>
          <Label>Dispense from</Label>
          <div className="flex h-12 overflow-hidden rounded-lg border border-input">
            {(["clinic", "pharmacy"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set("source", s)}
                className={cn(
                  "flex-1 text-sm font-medium capitalize transition-colors",
                  d.source === s ? "bg-brand text-brand-fg" : "bg-surface-raised text-ink-muted hover:bg-line/30",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {preview && (
        <div className="rounded-lg bg-brand/5 px-3 py-2 text-[13px] text-ink">
          <span className="font-mono font-semibold text-brand">{d.keyword || "shortcut"}</span>
          <span className="mx-1.5 text-ink-muted">→</span>
          {preview}
        </div>
      )}

      <Button type="submit" variant="brand" disabled={busy || !d.keyword.trim() || !d.name.trim()}>
        {busy ? "Adding…" : "+ Add medicine shortcut"}
      </Button>
    </form>
  );
}

// ── Medicine keyword: list row ────────────────────────────────────────────────

function MedicineKeywordRow({ kw, onChanged }: { kw: Keyword; onChanged: () => void }) {
  async function remove() {
    await fetch(`/api/keywords/${kw.id}`, { method: "DELETE" });
    onChanged();
  }

  const m = kw.medicine;
  const tags = m
    ? [m.dose, m.frequency, m.timing, m.source].filter(Boolean)
    : [];

  return (
    <li className="rounded-xl border border-line bg-surface px-3 py-2.5">
      <div className="flex items-center gap-3">
        <span className="shrink-0 rounded-lg bg-brand/10 px-2 py-1 font-mono text-[13px] font-semibold text-brand">
          {kw.keyword}
        </span>
        <span className="text-ink-muted" aria-hidden>→</span>
        <span className="min-w-0 flex-1 truncate text-sm text-ink">{kw.expansion}</span>
        <RowActions onDelete={remove} />
      </div>
      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 pl-[3.25rem]">
          {tags.map((t) => (
            <span key={t} className="rounded-md bg-line/50 px-1.5 py-0.5 text-[11px] font-medium capitalize text-ink-muted">
              {t}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}

// ── Shared bits ───────────────────────────────────────────────────────────────

function RowActions({ onEdit, onDelete }: { onEdit?: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-3">
      {onEdit && (
        <button onClick={onEdit} className="text-sm font-medium text-brand hover:underline">
          Edit
        </button>
      )}
      <button onClick={onDelete} className="text-sm font-medium text-sos hover:underline">
        Delete
      </button>
    </div>
  );
}

/** Labeled Type/Dose/Frequency/Timing select with the shared "＋ Add new…"
 *  behaviour — same custom-option flow as the consult MedicineEditor. */
function MedSelect({
  label,
  value,
  options,
  onChange,
  onCustomAdded,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  onCustomAdded?: (v: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={`med-${label}`}>{label}</Label>
      <SelectOrAdd
        value={value}
        options={options}
        onChange={onChange}
        onCustomAdded={onCustomAdded}
        placeholder={label}
      />
    </div>
  );
}

function KeywordsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px] w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
