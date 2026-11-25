import { BlogManager, type BlogRow } from "@/components/account/BlogManager";
import { requireDoctorPage } from "@/lib/auth/doctor";
import { paths } from "@/lib/site";

export const dynamic = "force-dynamic";

/** The doctor's health articles (DoctorProfile.blogPosts), newest first. */
export default async function BlogPage() {
  const me = await requireDoctorPage();
  const d = me.doctor;
  const live = d.status === "published" && d.citySlug && d.slug;
  const initial: BlogRow[] = [...(d.blogPosts ?? [])]
    .sort((a, b) => (b.publishedAt ?? b.updatedAt ?? new Date(0)).getTime() - (a.publishedAt ?? a.updatedAt ?? new Date(0)).getTime())
    .map((p) => ({
      id: String(p._id),
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt ?? "",
      body: p.body,
      tags: (p.tags ?? []).join(", "),
      ...(p.cover ? { cover: { publicId: p.cover.publicId ?? "", url: p.cover.url, ...(p.cover.alt ? { alt: p.cover.alt } : {}) } } : {}),
      status: p.status,
      ...(p.publishedAt ? { publishedAt: p.publishedAt.toISOString() } : {}),
      ...(p.updatedAt ? { updatedAt: p.updatedAt.toISOString() } : {}),
    }));

  return (
    <main className="space-y-6 pb-24 pt-6 lg:pt-0">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Health articles</h1>
        <p className="mt-1 text-body">Write simple guides for your patients. Published articles appear on your website in the “Health articles” section.</p>
      </div>
      <BlogManager initial={initial} pageUrl={live ? paths.doctor(d.citySlug!, d.slug!) : undefined} />
    </main>
  );
}
