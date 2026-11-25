import { z } from "zod";
import { BLOG_LIMITS } from "@/lib/blog";
import { LIMITS } from "@/lib/constants";
import { chips, email, sectionSchemas, t, url } from "@/lib/doctors/form";

/**
 * What a doctor may edit about their page from /account/profile and
 * /account/blog, on top of the clinic details in lib/doctors/account.ts:
 * short bio, about text, services, conditions, languages, interests, public
 * email, social links, and their health articles. Name, registration,
 * qualifications, specialty, photo and page address still go through
 * "Request a change" (they decide the page address or need checking).
 *
 * The about text is edited as plain text: blank lines split paragraphs and
 * lines starting with "- " become a bulleted list.
 */

export interface ProfileForm {
  shortBio: string;
  about: string;
  services: { name: string; description: string }[];
  conditions: string;
  languages: string;
  interests: string;
  email: string;
  links: { googleBusiness: string; instagram: string; facebook: string; linkedin: string; youtube: string; website: string };
}

const lines = (max: number, len: number) =>
  z
    .string()
    .max(max * (len + 2))
    .transform((s) =>
      s
        .split(/\n|,(?![^(]*\))/)
        .map((x) => x.trim())
        .filter(Boolean),
    )
    .pipe(chips(max, len));

export const profileSchema = z.object({
  shortBio: t(LIMITS.shortBio),
  about: z.string().max(5000, "Use at most 5000 characters."),
  services: sectionSchemas.practice.shape.services,
  conditions: lines(40, 80),
  languages: lines(12, 40),
  interests: lines(12, 60),
  email,
  links: z.object({
    googleBusiness: url,
    instagram: url,
    facebook: url,
    linkedin: url,
    youtube: url,
    website: url,
  }),
});

export type ProfileInput = z.output<typeof profileSchema>;

/** Free text for the NMC scan, keyed by field. */
export function profileTextFields(p: ProfileInput): Record<string, string> {
  return {
    shortBio: p.shortBio ?? "",
    about: p.about,
    ...Object.fromEntries(p.services.flatMap((s, i) => [[`services.${i}.name`, s.name], [`services.${i}.description`, s.description ?? ""]])),
    conditions: p.conditions.join(", "),
    interests: p.interests.join(", "),
  };
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const unescapeHtml = (s: string) => s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e: string) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " })[e]!);

/** Plain about text → simple HTML (p, ul/li). Text is escaped, so the result needs no further sanitising. */
export function aboutToHtml(text: string): string {
  return text
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const rows = block.split("\n").map((r) => r.trim());
      if (rows.every((r) => /^[-•*]\s+/.test(r))) return `<ul>${rows.map((r) => `<li>${escapeHtml(r.replace(/^[-•*]\s+/, ""))}</li>`).join("")}</ul>`;
      return `<p>${escapeHtml(rows.join(" "))}</p>`;
    })
    .join("");
}

/** Stored bio HTML → the plain text the editor shows (bold/italics are dropped). */
export function htmlToAbout(html: string | undefined): string {
  if (!html) return "";
  return unescapeHtml(
    html
      .replace(/\r?\n/g, " ")
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<\/(ul|ol)>/gi, "\n\n")
      .replace(/<(ul|ol)[^>]*>/gi, "\n\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

export const blogPostSchema = z.object({
  /** Existing post id; empty for a new post. */
  id: z.string().regex(/^([a-f0-9]{24})?$/i).default(""),
  title: z.string().trim().min(5, "Add a title (at least a few words).").max(BLOG_LIMITS.title, `Use at most ${BLOG_LIMITS.title} characters.`),
  excerpt: t(BLOG_LIMITS.excerpt),
  body: z
    .string()
    .trim()
    .min(200, "Write a little more (at least a short paragraph or two).")
    .max(BLOG_LIMITS.body, `Use at most ${BLOG_LIMITS.body} characters.`),
  tags: lines(BLOG_LIMITS.tags, BLOG_LIMITS.tag),
  cover: z
    .object({
      publicId: z.string().min(1).max(300),
      url: z
        .string()
        .max(1000)
        .refine((u) => u.startsWith("https://res.cloudinary.com/") || /^\/demo\/[\w/.-]+$/.test(u), "Images must be uploaded."),
      alt: t(200).optional(),
    })
    .nullable(),
  publish: z.boolean(),
});

export type BlogPostInput = z.output<typeof blogPostSchema>;

export function blogTextFields(p: BlogPostInput): Record<string, string> {
  return { title: p.title, excerpt: p.excerpt ?? "", body: p.body, tags: p.tags.join(", ") };
}
