import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

/** Metadata for hub pages. Empty hubs are noindex (and left out of the sitemap). */
export function hubMetadata(opts: {
  title: string;
  url: string;
  count: number;
  place: string;
  /** What the hub lists (drives the description wording). */
  listing?: "doctors" | "clinics" | "hospitals" | "places";
}): Metadata {
  const titleText = `${opts.title} | ${SITE_NAME}`;
  const listing = opts.listing ?? "doctors";
  const noun = { doctors: ["doctor", "doctors"], clinics: ["clinic", "clinics"], hospitals: ["hospital", "hospitals"], places: ["listing", "listings"] }[listing];
  const what = listing === "doctors" ? "clinic timings, addresses, fees and contact details" : "timings, addresses, doctors and contact details";
  const description =
    opts.count > 0
      ? `${opts.title}: ${what} for ${opts.count} ${opts.count === 1 ? noun[0] : noun[1]} in ${opts.place}.`
      : `${opts.title}. Timings, addresses and contact details on MediReach.`;
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

/** "1 skin clinic" / "3 skin clinics" / "2 ENT clinics" from a category's singular and plural names. */
export function countPhrase(n: number, cat: { name: string; plural: string }): string {
  const lower = (s: string) => s.split(" ").map((w) => (w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase())).join(" ");
  return n === 1 ? `1 ${lower(cat.name)}` : `${n} ${lower(cat.plural)}`;
}

/** "Doctors", "Doctors and clinics", "Doctors, clinics and hospitals" for what a hub actually lists. */
export function listedKinds(parts: { doctors: number; clinics: number; hospitals: number }): string {
  const names = [parts.doctors && "doctors", parts.clinics && "clinics", parts.hospitals && "hospitals"].filter(Boolean) as string[];
  if (names.length === 0) return "Doctors";
  const joined = names.length === 1 ? names[0]! : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  return joined[0]!.toUpperCase() + joined.slice(1);
}

export function doctorsCount(n: number): string {
  return `${n} ${n === 1 ? "doctor" : "doctors"}`;
}
