"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { ArrowLeft, CheckCircle2, Eye, FilePenLine, Loader2, Newspaper, Plus, Trash2 } from "lucide-react";
import { deleteBlogPostAction, saveBlogPostAction, signDoctorUploadAction } from "@/app/account/actions";
import { SimpleImageUpload } from "@/components/admin/doctor-editor/PhotoCropUpload";
import { Field } from "@/components/admin/form/fields";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BLOG_LIMITS, readMinutes } from "@/lib/blog";
import { cn } from "@/lib/cn";

export interface BlogRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  tags: string;
  cover?: { publicId: string; url: string; alt?: string };
  status: "draft" | "published";
  publishedAt?: string;
  updatedAt?: string;
}

const EMPTY: BlogRow = { id: "", slug: "", title: "", excerpt: "", body: "", tags: "", status: "draft" };
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/**
 * Health articles: a list of the doctor's posts and a simple editor (title,
 * summary, cover photo, text, topics). Save as draft or publish; published
 * posts appear in the "Health articles" section of designs that have one.
 */
export function BlogManager({ initial, pageUrl }: { initial: BlogRow[]; pageUrl?: string }) {
  const [posts, setPosts] = useState(initial);
  const [editing, setEditing] = useState<BlogRow | null>(null);

  if (editing) {
    return (
      <Editor
        post={editing}
        onCancel={() => setEditing(null)}
        onSaved={(row) => {
          setPosts((all) => (all.some((p) => p.id === row.id) ? all.map((p) => (p.id === row.id ? row : p)) : [row, ...all]));
          setEditing(row);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setEditing(EMPTY)}
          className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-ink px-5 font-semibold text-paper hover:bg-ink-700"
        >
          <Plus className="size-4" /> New article
        </button>
        {pageUrl && (
          <a href={`${pageUrl}#blog`} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-line bg-surface px-4 text-sm font-semibold text-ink hover:border-ink/40">
            <Eye className="size-4" /> See them on my website
          </a>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
          <Newspaper aria-hidden className="mx-auto size-10 text-lagoon/60" strokeWidth={1.5} />
          <p className="mt-3 font-semibold text-ink">No articles yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Short, practical notes on questions patients often ask, like monsoon fevers or checking blood pressure at home, help people get to know you.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-3 shadow-soft sm:flex-nowrap sm:p-4">
              <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-mist">
                {p.cover ? <Image src={p.cover.url} alt="" fill sizes="112px" className="object-cover" /> : <Newspaper aria-hidden className="absolute inset-0 m-auto size-6 text-lagoon/50" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      p.status === "published" ? "bg-leaf/12 text-leaf-text" : "bg-mist text-muted-foreground",
                    )}
                  >
                    {p.status === "published" ? "Published" : "Draft"}
                  </span>
                  {p.publishedAt && <span className="text-xs text-muted-foreground">{dateFmt.format(new Date(p.publishedAt))}</span>}
                  <span className="text-xs text-muted-foreground">· {readMinutes(p.body)} min read</span>
                </p>
                <p className="mt-1 truncate font-semibold text-ink">{p.title}</p>
                <p className="line-clamp-1 text-sm text-muted-foreground">{p.excerpt || p.body.slice(0, 140)}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(p)}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold text-ink hover:border-ink/40"
              >
                <FilePenLine className="size-4" /> Edit
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Editor({ post, onCancel, onSaved }: { post: BlogRow; onCancel: () => void; onSaved: (row: BlogRow) => void }) {
  const [form, setForm] = useState(post);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const update = (patch: Partial<BlogRow>) => {
    setForm((f) => ({ ...f, ...patch }));
    setMessage(null);
  };

  const save = (publish: boolean) =>
    start(async () => {
      const res = await saveBlogPostAction({
        id: form.id,
        title: form.title,
        excerpt: form.excerpt,
        body: form.body,
        tags: form.tags,
        cover: form.cover ?? null,
        publish,
      });
      if (res.ok) {
        setErrors({});
        const row: BlogRow = {
          ...form,
          id: res.data.id,
          slug: res.data.slug,
          status: res.data.status,
          publishedAt: form.publishedAt ?? (publish ? new Date().toISOString() : undefined),
        };
        setForm(row);
        onSaved(row);
        setMessage({ ok: true, text: publish ? "Published. It is on your website now." : "Saved as a draft. Only you can see it." });
      } else {
        setErrors(res.fieldErrors ?? {});
        setMessage({ ok: false, text: res.error });
      }
    });

  const remove = () =>
    start(async () => {
      const res = await deleteBlogPostAction({ id: form.id });
      if (res.ok) window.location.reload();
      else setMessage({ ok: false, text: res.error });
    });

  return (
    <div className="space-y-5">
      <button type="button" onClick={onCancel} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-ink hover:text-lagoon">
        <ArrowLeft className="size-4" /> All articles
      </button>
      <section className="space-y-5 rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-6">
        <Field label="Title" htmlFor="title" required error={errors.title}>
          <Input id="title" maxLength={BLOG_LIMITS.title} value={form.title} onChange={(e) => update({ title: e.target.value })} placeholder="e.g. Monsoon fevers: when to see a doctor" />
        </Field>
        <Field label="Summary" htmlFor="excerpt" help="One or two lines shown on the article card. Leave empty to use the start of the text." error={errors.excerpt}>
          <Textarea id="excerpt" rows={2} maxLength={BLOG_LIMITS.excerpt} value={form.excerpt} onChange={(e) => update({ excerpt: e.target.value })} />
        </Field>
        <div className="space-y-2">
          <p className="text-sm font-medium text-ink">Cover photo</p>
          <p className="text-sm text-muted-foreground">A landscape photo works best. No patient photos.</p>
          <SimpleImageUpload
            purpose="blog"
            label="Add cover photo"
            value={form.cover}
            sign={signDoctorUploadAction}
            onError={(text) => setMessage({ ok: false, text })}
            onChange={(img) => update({ cover: img ? { ...img, alt: form.title } : undefined })}
          />
        </div>
        <Field
          label="Article"
          htmlFor="body"
          required
          help={`Leave a blank line between paragraphs. ${form.body.trim().split(/\s+/).filter(Boolean).length} words · about ${readMinutes(form.body)} min read.`}
          error={errors.body}
        >
          <Textarea id="body" rows={18} maxLength={BLOG_LIMITS.body} value={form.body} onChange={(e) => update({ body: e.target.value })} className="leading-relaxed" />
        </Field>
        <Field label="Topics" htmlFor="tags" help="Up to 6, separated by commas, e.g. Diabetes, Diet" error={errors.tags}>
          <Input id="tags" value={form.tags} onChange={(e) => update({ tags: e.target.value })} />
        </Field>
        <p className="rounded-xl bg-paper px-4 py-3 text-sm text-muted-foreground">
          Keep it general and factual. NMC rules don&apos;t allow claims of cures, guarantees, superlatives or patient testimonials. Each article ends with a note that it is general information.
        </p>
      </section>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-3 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:rounded-2xl sm:border sm:px-5">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => save(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-ink px-5 font-semibold text-paper hover:bg-ink-700 disabled:opacity-50"
          >
            {pending && <Loader2 className="size-4 animate-spin" />} {form.status === "published" ? "Save and keep published" : "Publish"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => save(false)}
            className="inline-flex min-h-11 items-center rounded-[10px] border border-line bg-surface px-4 text-sm font-semibold text-ink hover:border-ink/40 disabled:opacity-50"
          >
            {form.status === "published" ? "Unpublish (keep as draft)" : "Save draft"}
          </button>
        </div>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "flex items-center gap-1.5 text-sm text-leaf-text" : "text-sm text-clay-text"}>
            {message.ok && <CheckCircle2 className="size-4" />} {message.text}
          </p>
        )}
        {form.id && (
          <div className="sm:ml-auto">
            {confirmDelete ? (
              <span className="flex items-center gap-2 text-sm">
                Delete for good?
                <button type="button" onClick={remove} disabled={pending} className="rounded-lg bg-clay px-3 py-1.5 font-semibold text-white">
                  Delete
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg px-2 py-1.5 font-semibold text-ink">
                  Keep
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-clay-text">
                <Trash2 className="size-4" /> Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
