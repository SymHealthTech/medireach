import { HEALTH_TIPS, type HealthTip } from "@/content/health-tips";
import type { PublicHealthTip } from "@/templates/types";

/**
 * Picks the general health tips a doctor's website shows (content/health-tips.ts).
 * Tips matching the doctor's specialties come first, then general ones; the
 * order is shuffled by a per-doctor seed, so two doctors of the same
 * specialty usually show different tips. A doctor can also choose their own
 * (DoctorProfile.healthTipSlugs).
 */

export const HEALTH_TIPS_SHOWN = 2;

/** Small stable string hash (FNV-1a). */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function readMinutes(paragraphs: readonly string[]): number {
  const words = paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Tips that suit these specialties (specialty matches first, then general tips), in a per-doctor order. */
export function healthTipCandidates(seed: string, specialtySlugs: readonly string[]): HealthTip[] {
  const order = (t: HealthTip) => hash(`${seed}:${t.slug}`);
  const matching = HEALTH_TIPS.filter((t) => t.specialties !== "all" && t.specialties.some((s) => specialtySlugs.includes(s))).sort((a, b) => order(a) - order(b));
  const general = HEALTH_TIPS.filter((t) => t.specialties === "all").sort((a, b) => order(a) - order(b));
  const rest = HEALTH_TIPS.filter((t) => !matching.includes(t) && !general.includes(t)).sort((a, b) => order(a) - order(b));
  return [...matching, ...general, ...rest];
}

export function toPublicTip(t: HealthTip): PublicHealthTip {
  return {
    slug: t.slug,
    title: t.title,
    excerpt: t.excerpt,
    paragraphs: [...t.body],
    cover: { url: `/templates/health-tips/${t.cover.file}.jpg`, alt: t.cover.alt },
    topic: t.topic,
    readMinutes: readMinutes(t.body),
  };
}

/**
 * The tips to show: the doctor's own choice when it is valid, topped up with
 * automatic picks; never two with the same cover photo.
 */
export function pickHealthTips(seed: string, specialtySlugs: readonly string[], chosen: readonly string[] = [], count = HEALTH_TIPS_SHOWN): PublicHealthTip[] {
  const picked: HealthTip[] = [];
  const add = (t: HealthTip | undefined) => {
    if (t && picked.length < count && !picked.includes(t) && !picked.some((p) => p.cover.file === t.cover.file)) picked.push(t);
  };
  for (const slug of chosen) add(HEALTH_TIPS.find((t) => t.slug === slug));
  for (const t of healthTipCandidates(seed, specialtySlugs)) add(t);
  return picked.map(toPublicTip);
}

/** The choices on the doctor's Health tips page: suitable tips first (max 12), and what "automatic" shows. */
export function healthTipOptions(seed: string, specialtySlugs: readonly string[]) {
  const options = healthTipCandidates(seed, specialtySlugs)
    .slice(0, 12)
    .map((t) => ({ slug: t.slug, title: t.title, excerpt: t.excerpt, topic: t.topic, cover: `/templates/health-tips/${t.cover.file}.jpg` }));
  const autoPicks = pickHealthTips(seed, specialtySlugs).map((t) => t.slug);
  return { options, autoPicks };
}
