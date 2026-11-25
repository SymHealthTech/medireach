import { z } from "zod";
import { HEALTH_TIPS } from "@/content/health-tips";
import { HEALTH_TIPS_SHOWN } from "@/lib/health-tips";
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
// Health tips (general articles, content/health-tips.ts)
// ---------------------------------------------------------------------------

export const healthTipsSchema = z.object({
  show: z.boolean(),
  /** Chosen tips; empty = automatic. Unknown slugs are dropped. */
  slugs: z
    .array(z.string().max(100))
    .max(HEALTH_TIPS_SHOWN)
    .transform((a) => a.filter((s) => HEALTH_TIPS.some((t) => t.slug === s))),
});
