"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, UserRound, Users } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { searchAction, type SearchResult } from "@/app/admin/(dash)/actions";
import type { NavItem } from "@/components/admin/nav";

const GROUPS: { type: SearchResult["type"]; heading: string; icon: typeof UserRound }[] = [
  { type: "doctor", heading: "Doctors", icon: UserRound },
  { type: "lead", heading: "Leads", icon: Users },
  { type: "hospital", heading: "Hospitals", icon: Building2 },
];

/**
 * ⌘K / Ctrl+K command palette: searches doctors, leads and hospitals on the
 * server (debounced) and lists dashboard sections for quick navigation.
 */
export function CommandSearch({
  open,
  onOpenChange,
  nav,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nav: NavItem[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const id = setTimeout(() => {
      startTransition(async () => {
        try {
          setResults(await searchAction(q));
        } catch {
          setResults([]);
        }
      });
    }, 200);
    return () => clearTimeout(id);
  }, [query]);

  function go(href: string) {
    onOpenChange(false);
    setQuery("");
    router.push(href);
  }

  const sections = nav.filter((n) => n.label.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Search doctors, leads and hospitals"
      shouldFilter={false}
    >
      <CommandInput placeholder="Search doctors, leads, hospitals…" value={query} onValueChange={setQuery} />
      <CommandList>
        {pending && (
          <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Searching…
          </div>
        )}
        {!pending && query.trim().length >= 2 && results.length === 0 && sections.length === 0 && (
          <CommandEmpty>No matches for “{query.trim()}”.</CommandEmpty>
        )}
        {GROUPS.map(({ type, heading, icon: Icon }) => {
          const items = results.filter((r) => r.type === type);
          if (items.length === 0) return null;
          return (
            <CommandGroup key={type} heading={heading}>
              {items.map((r) => (
                <CommandItem key={`${type}-${r.id}`} value={`${type}-${r.id}`} onSelect={() => go(r.href)}>
                  <Icon />
                  <span className="truncate">{r.title}</span>
                  {r.subtitle && <span className="ml-auto truncate text-xs text-muted-foreground">{r.subtitle}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
        {sections.length > 0 && (
          <CommandGroup heading="Go to">
            {sections.map(({ href, label, icon: Icon }) => (
              <CommandItem key={href} value={`nav-${href}`} onSelect={() => go(href)}>
                <Icon />
                {label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
