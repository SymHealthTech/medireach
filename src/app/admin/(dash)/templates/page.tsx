import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { rolesFor } from "@/components/admin/nav";
import { ThemeMiniPreview } from "@/components/public/ThemeMiniPreview";
import { requireAdminPage } from "@/lib/auth/admin";
import { SITE_TEMPLATE_TYPES, type SiteTemplateType } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";
import { TemplateSlot } from "@/models/TemplateSlot";
import { SPECIALTY_THEMES } from "@/themes/specialty";
import { TemplateSlotCard, type SlotView } from "./TemplateSlotCard";

export const metadata: Metadata = { title: "Designs & themes" };

const ROW_TITLE: Record<SiteTemplateType, string> = {
  portfolio: "Doctor portfolio designs",
  clinic: "Clinic site designs",
  hospital: "Hospital site designs",
  card: "Visiting card designs",
};

type Counts = { _id: string; n: number }[];
const countOf = (rows: Counts, key: string) => rows.find((r) => r._id === key)?.n ?? 0;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Designs & themes (MEDIREACH_BUILD_PROMPT.md Phase 4.5): four rows of 5 design
 * slots (doctor portfolio, clinic site, hospital site, visiting card) and the
 * 13 specialty themes. Only "ready" slots can be chosen; the rest fall back to
 * Classic. Themes are configuration (src/themes/specialty.ts), edited in code.
 */
export default async function DesignsAdminPage() {
  await requireAdminPage(rolesFor("/admin/templates"));
  await connectToDatabase();
  const group = (field: string, match: Record<string, unknown> = {}) => [{ $match: match }, { $group: { _id: `$${field}`, n: { $sum: 1 } } }];
  const [slots, portfolioUse, doctorCardUse, siteCardUse, clinicUse, hospitalUse, themeUse] = await Promise.all([
    TemplateSlot.find().sort({ type: 1, key: 1 }).lean(),
    DoctorProfile.aggregate<Counts[number]>(group("portfolioTemplateId")),
    DoctorProfile.aggregate<Counts[number]>(group("cardTemplateId")),
    Establishment.aggregate<Counts[number]>(group("cardTemplateId")),
    Establishment.aggregate<Counts[number]>(group("siteTemplateId", { kind: "clinic" })),
    Establishment.aggregate<Counts[number]>(group("siteTemplateId", { kind: "hospital" })),
    Establishment.aggregate<Counts[number]>(group("themeKey")),
  ]);

  const usage = (type: SiteTemplateType, key: string): string => {
    if (type === "portfolio") return plural(countOf(portfolioUse, key), "doctor", "doctors");
    if (type === "clinic") return plural(countOf(clinicUse, key), "clinic", "clinics");
    if (type === "hospital") return plural(countOf(hospitalUse, key), "hospital", "hospitals");
    return `${plural(countOf(doctorCardUse, key), "doctor", "doctors")} · ${plural(countOf(siteCardUse, key), "site", "sites")}`;
  };
  const previewHref = (type: SiteTemplateType, key: string) =>
    type === "portfolio"
      ? `/admin/templates/preview/${key}`
      : type === "card"
        ? `/admin/templates/preview/${key}?type=card`
        : `/admin/templates/preview/site/${type}/${key}`;

  const view = (type: SiteTemplateType): SlotView[] =>
    slots
      .filter((s) => s.type === type)
      .map((s) => ({
        type,
        key: s.key,
        name: s.name,
        status: s.status,
        isDefault: s.isDefault,
        ...(s.previewImage?.url ? { preview: { publicId: s.previewImage.publicId, url: s.previewImage.url } } : {}),
        usage: usage(type, s.key),
        previewHref: previewHref(type, s.key),
      }));

  return (
    <div className="space-y-10">
      <p className="max-w-2xl text-muted-foreground">
        Five design slots for each product and for visiting cards. Only <strong>ready</strong> designs can be chosen; the rest show as
        “Coming soon” and fall back to Classic. Every design renders the same SEO. Publicly these are called specialty designs, never templates.
      </p>
      {SITE_TEMPLATE_TYPES.map((type) => (
        <section key={type} className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-ink">{ROW_TITLE[type]}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {view(type).map((s) => (
              <TemplateSlotCard key={`${s.type}-${s.key}`} slot={s} />
            ))}
          </div>
        </section>
      ))}

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Specialty themes</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Colours, icon, section order and suggested services for clinic and hospital sites. Read-only here: they live in
            <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">src/themes/specialty.ts</code>.
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {SPECIALTY_THEMES.map((t) => {
            const n = countOf(themeUse, t.key);
            return (
              <li key={t.key} className="flex flex-col gap-2 rounded-xl border border-line bg-card p-3 shadow-soft">
                <ThemeMiniPreview theme={t} />
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-ink">{t.name}</p>
                  <span className="flex gap-1" aria-hidden>
                    {[t.palette.primary, t.palette.accent, t.palette.soft].map((c) => (
                      <span key={c} className="size-3 rounded-full border border-black/10" style={{ background: c }} />
                    ))}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t.kind === "hospital" ? "Hospital" : "Clinic"} theme · {plural(n, "site", "sites")}
                </p>
                <a href={`/designs/${t.key}`} target="_blank" rel="noopener" className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-ink hover:underline">
                  <ExternalLink className="size-3.5" /> View sample
                </a>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
