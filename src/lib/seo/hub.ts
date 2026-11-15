import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

/** Metadata for hub pages. Empty hubs are noindex (and left out of the sitemap). */
export function hubMetadata(opts: { title: string; url: string; count: number; place: string }): Metadata {
  const titleText = `${opts.title} | ${SITE_NAME}`;
  const description =
    opts.count > 0
      ? `${opts.title}: clinic timings, addresses, fees and contact details for ${opts.count} ${
          opts.count === 1 ? "doctor" : "doctors"
        } in ${opts.place}.`
      : `${opts.title}. Clinic timings, addresses and contact details on MediReach.`;
  return {
    title: { absolute: titleText.length <= 60 ? titleText : opts.title },
    description,
    alternates: { canonical: opts.url },
    robots: opts.count > 0 ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { type: "website", url: opts.url, title: opts.title, description, siteName: SITE_NAME },
  };
}

/** "1 doctor listed as a cardiologist" / "3 doctors listed as cardiologists". */
export function listedAs(n: number, spec: { name: string; plural: string }): string {
  const lower = (s: string) => s.split(" ").map((w) => (w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase())).join(" ");
  if (n === 1) {
    const name = lower(spec.name);
    return `1 doctor listed as ${/^[aeiou]/i.test(name) || name.startsWith("ENT") ? "an" : "a"} ${name}`;
  }
  return `${n} doctors listed as ${lower(spec.plural)}`;
}

export function doctorsCount(n: number): string {
  return `${n} ${n === 1 ? "doctor" : "doctors"}`;
}
