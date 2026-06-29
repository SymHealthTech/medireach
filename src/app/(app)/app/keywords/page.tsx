"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiGet, apiPost } from "@/lib/client/api";

interface Keyword {
  id: string;
  keyword: string;
  expansion: string;
}

interface EditState {
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
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ keyword: "", expansion: "" });

  const load = useCallback(async () => {
    const data = await apiGet<{ keywords: Keyword[] }>("/api/keywords").catch(() => ({ keywords: [] }));
    setKeywords(data.keywords);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <KeywordsSkeleton />;

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

  function startEdit(k: Keyword) {
    setEditingId(k.id);
    setEditState({ keyword: k.keyword, expansion: k.expansion });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    await fetch(`/api/keywords/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editState),
    });
    setEditingId(null);
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
          <li key={k.id} className="rounded-xl border border-line bg-surface-raised p-3">
            {editingId === k.id ? (
              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input
                    value={editState.keyword}
                    onChange={(e) => setEditState((s) => ({ ...s, keyword: e.target.value }))}
                    placeholder="Shortcut"
                  />
                  <Input
                    value={editState.expansion}
                    onChange={(e) => setEditState((s) => ({ ...s, expansion: e.target.value }))}
                    placeholder="Expands to"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="brand" onClick={() => saveEdit(k.id)}>
                    Save
                  </Button>
                  <Button type="button" variant="ghost" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-ink">
                  <span className="font-semibold">{k.keyword}</span> → {k.expansion}
                </span>
                <div className="flex items-center gap-3">
                  <button onClick={() => startEdit(k)} className="text-sm text-brand hover:underline">
                    Edit
                  </button>
                  <button onClick={() => remove(k.id)} className="text-sm text-sos hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function KeywordsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Card>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            ))}
          </div>
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </Card>
      <ul className="space-y-2">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-center justify-between rounded-xl border border-line bg-surface-raised p-3">
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-4 w-12" />
          </li>
        ))}
      </ul>
    </div>
  );
}
