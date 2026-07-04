"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { apiGet } from "@/lib/client/api";

const SLUGS = [
  { slug: "privacy-policy", label: "Privacy Policy" },
  { slug: "medical-disclaimer", label: "Medical Disclaimer" },
  { slug: "user-guide", label: "User Guide" },
] as const;

/** Content management (spec §6.6): edit legal/help pages without a deploy. */
export default function AdminContentPage() {
  const [slug, setSlug] = useState<string>(SLUGS[0].slug);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ title: string; body: string }>(`/api/admin/content/${slug}`)
      .then((d) => {
        setTitle(d.title);
        setBody(d.body);
      })
      .catch(() => {});
  }, [slug]);

  async function save() {
    setMsg(null);
    const res = await fetch(`/api/admin/content/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    setMsg(res.ok ? "Saved." : "Save failed.");
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight text-ink">Content</h1>
      <div className="flex gap-2">
        {SLUGS.map((s) => (
          <button
            key={s.slug}
            onClick={() => setSlug(s.slug)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${slug === s.slug ? "bg-brand text-brand-fg" : "border border-line text-ink-muted"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {msg && <p className="rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand">{msg}</p>}
      <Card className="space-y-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={16} />
        <Button variant="brand" onClick={save}>Save</Button>
      </Card>
    </div>
  );
}
