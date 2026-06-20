"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { apiGet, apiPost } from "@/lib/client/api";

interface Keyword {
  id: string;
  keyword: string;
  expansion: string;
}

/**
 * Edit Keyword (spec §9.5, §12) — the doctor's personal shorthand dictionary
 * used by the AI structuring layer. Strictly personal.
 */
export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [keyword, setKeyword] = useState("");
  const [expansion, setExpansion] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await apiGet<{ keywords: Keyword[] }>("/api/keywords").catch(() => ({ keywords: [] }));
    setKeywords(data.keywords);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiPost("/api/keywords", { keyword, expansion });
      setKeyword("");
      setExpansion("");
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/keywords/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Edit Keyword</h1>
        <p className="text-sm text-ink-muted">
          Your personal shorthand, expanded automatically during dictation. e.g. &quot;p5&quot; →
          &quot;Tab. Paracetamol 500mg&quot;.
        </p>
      </div>

      <Card>
        <form onSubmit={add} className="space-y-3">
          {error && <p className="text-sm text-sos">{error}</p>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="kw">Shortcut</Label>
              <Input id="kw" value={keyword} onChange={(e) => setKeyword(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="ex">Expands to</Label>
              <Input id="ex" value={expansion} onChange={(e) => setExpansion(e.target.value)} required />
            </div>
          </div>
          <Button type="submit" variant="brand">
            Add shortcut
          </Button>
        </form>
      </Card>

      <ul className="space-y-2">
        {keywords.map((k) => (
          <li key={k.id} className="flex items-center justify-between rounded-xl border border-line bg-surface-raised p-3">
            <span className="text-ink">
              <span className="font-semibold">{k.keyword}</span> → {k.expansion}
            </span>
            <button onClick={() => remove(k.id)} className="text-sm text-sos hover:underline">
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
