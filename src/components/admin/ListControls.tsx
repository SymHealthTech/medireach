"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * URL-driven list controls: search box + filter selects + pagination. State
 * lives in the query string so lists are shareable and server-rendered.
 */

export interface FilterDef {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}

export function ListToolbar({
  placeholder = "Search…",
  filters = [],
  sorts,
  search = true,
}: {
  placeholder?: string;
  filters?: FilterDef[];
  sorts?: { value: string; label: string }[];
  /** Hide the text search when a list is filter-only. */
  search?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, start] = useTransition();

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const id = setTimeout(() => update({ q }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce on q only
  }, [q]);

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
      {search && <label className="relative flex-1 lg:min-w-64">
        <span className="sr-only">Search</span>
        {pending ? (
          <Loader2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : (
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
        />
      </label>}
      {(filters.length > 0 || sorts) && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
          {filters.map((f) => (
            <select
              key={f.name}
              aria-label={f.label}
              value={params.get(f.name) ?? ""}
              onChange={(e) => update({ [f.name]: e.target.value })}
              className={cn(
                "h-11 shrink-0 rounded-lg border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                params.get(f.name) && "border-ink/50 font-medium",
              )}
            >
              <option value="">{f.label}: all</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ))}
          {sorts && (
            <select
              aria-label="Sort"
              value={params.get("sort") ?? sorts[0]?.value ?? ""}
              onChange={(e) => update({ sort: e.target.value })}
              className="h-11 shrink-0 rounded-lg border border-input bg-card px-3 text-sm shadow-xs outline-none"
            >
              {sorts.map((s) => (
                <option key={s.value} value={s.value}>
                  Sort: {s.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

export function Pagination({ page, pageCount, total }: { page: number; pageCount: number; total: number }) {
  const pathname = usePathname();
  const params = useSearchParams();
  if (pageCount <= 1) return <p className="text-sm text-muted-foreground">{total} total</p>;
  const href = (p: number) => {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(p));
    return `${pathname}?${next.toString()}`;
  };
  const btn = "inline-flex h-10 items-center gap-1 rounded-lg border border-line bg-card px-3 text-sm font-medium";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Page {page} of {pageCount} · {total} total
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={btn}>
            <ChevronLeft className="size-4" /> Previous
          </Link>
        ) : (
          <span className={cn(btn, "opacity-40")}>
            <ChevronLeft className="size-4" /> Previous
          </span>
        )}
        {page < pageCount ? (
          <Link href={href(page + 1)} className={btn}>
            Next <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span className={cn(btn, "opacity-40")}>
            Next <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </nav>
  );
}
