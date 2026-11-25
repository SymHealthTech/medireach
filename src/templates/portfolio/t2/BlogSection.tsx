"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarDays, Clock, X } from "lucide-react";
import type { PublicBlogPost } from "@/templates/types";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

/**
 * Health articles: cards (newest first, first one large) that open the full
 * article in a reading dialog. The articles are rendered into the page (inside
 * closed dialogs), so they are crawlable; #blog-{slug} links open one directly.
 */
export function BlogSection({ posts, author }: { posts: PublicBlogPost[]; author: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLDialogElement | null>>({});

  useEffect(() => {
    const fromHash = () => {
      const slug = window.location.hash.match(/^#blog-(.+)$/)?.[1];
      if (slug && posts.some((p) => p.slug === slug)) setOpen(slug);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [posts]);

  useEffect(() => {
    for (const [slug, el] of Object.entries(refs.current)) {
      if (!el) continue;
      if (slug === open && !el.open) el.showModal();
      if (slug !== open && el.open) el.close();
    }
  }, [open]);

  const close = () => {
    setOpen(null);
    if (window.location.hash.startsWith("#blog-")) history.replaceState(history.state, "", window.location.pathname + window.location.search + "#blog");
  };

  const [first, ...rest] = posts;
  if (!first) return null;

  return (
    <>
      <div className="mt-12 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <PostCard post={first} large onOpen={setOpen} />
        <div className="grid gap-6">
          {rest.slice(0, 2).map((p) => (
            <PostCard key={p.slug} post={p} onOpen={setOpen} />
          ))}
        </div>
      </div>
      {rest.length > 2 && (
        <ul className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rest.slice(2).map((p) => (
            <li key={p.slug}>
              <PostCard post={p} onOpen={setOpen} />
            </li>
          ))}
        </ul>
      )}

      {posts.map((p) => (
        <dialog
          key={p.slug}
          ref={(el) => {
            refs.current[p.slug] = el;
          }}
          onClose={() => open === p.slug && close()}
          onClick={(e) => e.target === e.currentTarget && close()}
          aria-labelledby={`post-${p.slug}`}
          className="m-auto max-h-[92dvh] w-[min(760px,94vw)] overflow-y-auto rounded-3xl bg-white p-0 text-cm-text shadow-cm-lg backdrop:bg-cm-navy/70 backdrop:backdrop-blur-sm"
        >
          <article>
            {p.cover && (
              <div className="relative aspect-[16/8] w-full bg-cm-sky">
                <Image src={p.cover.url} alt={p.cover.alt} fill sizes="760px" className="object-cover" />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-cm-navy/60 to-transparent" />
              </div>
            )}
            <button
              type="button"
              onClick={close}
              aria-label="Close article"
              className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/90 text-cm-navy shadow-cm transition hover:bg-white"
            >
              <X className="size-5" strokeWidth={2} />
            </button>
            <div className="px-6 pb-10 pt-7 sm:px-10">
              <PostMeta post={p} />
              <h3 id={`post-${p.slug}`} className="mt-3 text-2xl font-bold leading-tight text-cm-navy sm:text-[32px]">
                {p.title}
              </h3>
              <p className="mt-2 text-sm font-medium text-cm-teal">By {author}</p>
              <div className="cm-blog-body mt-6 text-[17px] leading-[1.8] text-cm-text/90">
                {p.paragraphs.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
              <p className="mt-8 rounded-2xl bg-cm-sky px-5 py-4 text-sm text-cm-muted">
                This article is general health information, not advice for your own condition. Please consult a doctor before changing any treatment.
              </p>
            </div>
          </article>
        </dialog>
      ))}
    </>
  );
}

function PostMeta({ post, light }: { post: PublicBlogPost; light?: boolean }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold uppercase tracking-[0.12em] ${light ? "text-white/80" : "text-cm-muted"}`}>
      {post.tags[0] && <span className={light ? "text-cm-gold" : "text-cm-teal"}>{post.tags[0]}</span>}
      <span className="inline-flex items-center gap-1.5">
        <CalendarDays aria-hidden className="size-3.5" />
        {dateFmt.format(new Date(post.publishedAt))}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock aria-hidden className="size-3.5" />
        {post.readMinutes} min read
      </span>
    </p>
  );
}

function PostCard({ post, large, onOpen }: { post: PublicBlogPost; large?: boolean; onOpen: (slug: string) => void }) {
  const href = `#blog-${post.slug}`;
  if (large) {
    return (
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          onOpen(post.slug);
        }}
        className="cm-reveal group relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-3xl bg-cm-navy p-7 text-white shadow-cm sm:p-9"
      >
        {post.cover && (
          <Image src={post.cover.url} alt={post.cover.alt} fill sizes="(min-width: 1024px) 640px, 100vw" className="object-cover transition duration-700 group-hover:scale-105" />
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-cm-navy via-cm-navy/60 to-cm-navy/5" />
        <div className="relative">
          <PostMeta post={post} light />
          <h3 className="mt-3 text-2xl font-bold leading-snug sm:text-3xl">{post.title}</h3>
          <p className="mt-3 line-clamp-2 max-w-xl text-white/80">{post.excerpt}</p>
          <span className="mt-5 inline-flex items-center gap-2 font-semibold text-white">
            Read article <ArrowRight aria-hidden className="size-4 transition group-hover:translate-x-1" />
          </span>
        </div>
      </a>
    );
  }
  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onOpen(post.slug);
      }}
      className="cm-reveal group flex h-full gap-5 overflow-hidden rounded-3xl bg-white p-4 shadow-cm ring-1 ring-cm-line transition hover:-translate-y-1 hover:shadow-cm-lg"
    >
      {post.cover && (
        <div className="relative w-32 shrink-0 overflow-hidden rounded-2xl bg-cm-sky sm:w-40">
          <Image src={post.cover.url} alt={post.cover.alt} fill sizes="160px" className="object-cover transition duration-700 group-hover:scale-110" />
        </div>
      )}
      <div className="flex min-w-0 flex-col py-1">
        <PostMeta post={post} />
        <h3 className="mt-2 text-lg font-bold leading-snug text-cm-navy group-hover:text-cm-teal">{post.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-cm-muted">{post.excerpt}</p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-sm font-semibold text-cm-teal">
          Read <ArrowRight aria-hidden className="size-3.5 transition group-hover:translate-x-1" />
        </span>
      </div>
    </a>
  );
}
