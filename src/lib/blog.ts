import { storyParagraphs } from "@/lib/format";
import { slugify } from "@/lib/slug";
import type { PublicBlogPost } from "@/templates/types";

/**
 * Doctor blog (health articles written from the doctor's account). Plain text
 * only: blank lines split paragraphs, so nothing needs sanitising.
 */

export const BLOG_LIMITS = { posts: 30, title: 140, excerpt: 300, body: 12000, tags: 6, tag: 40 } as const;

/** Reading time at ~200 words a minute, at least 1. */
export function readMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** First ~200 characters of the body, cut at a word, when no excerpt was written. */
export function autoExcerpt(body: string, max = 200): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, flat.lastIndexOf(" ", max)).replace(/[,.;:]$/, "")}…`;
}

/** A slug unique among `taken` ("monsoon-fever", "monsoon-fever-2"…). */
export function uniqueBlogSlug(title: string, taken: Iterable<string>): string {
  const base = slugify(title).slice(0, 70).replace(/-+$/, "") || "article";
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let i = 2; ; i++) if (!used.has(`${base}-${i}`)) return `${base}-${i}`;
}

export interface BlogPostLike {
  _id?: unknown;
  id?: string;
  title: string;
  slug: string;
  excerpt?: string;
  body: string;
  cover?: { url: string; alt?: string };
  tags?: string[];
  status?: "draft" | "published";
  publishedAt?: Date | string;
}

/** Published posts, newest first, as templates render them. */
export function toPublicBlog(posts: readonly BlogPostLike[] | undefined, author: string): PublicBlogPost[] {
  return (posts ?? [])
    .filter((p) => (p.status ?? "published") === "published" && p.publishedAt)
    .map((p) => ({
      id: p.id ?? String(p._id ?? p.slug),
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt || autoExcerpt(p.body),
      paragraphs: storyParagraphs(p.body),
      ...(p.cover ? { cover: { url: p.cover.url, alt: p.cover.alt || `${p.title} – ${author}` } } : {}),
      tags: p.tags ?? [],
      publishedAt: new Date(p.publishedAt!).toISOString(),
      readMinutes: readMinutes(p.body),
    }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
