import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { KindTabs, type ProductKind } from "@/components/admin/KindTabs";
import { rolesFor } from "@/components/admin/nav";
import { ThemeMiniPreview } from "@/components/public/ThemeMiniPreview";
import { requireAdminPage } from "@/lib/auth/admin";
import { CARD_STYLES_BY_GROUP } from "@/lib/cards/styles";
import type { SiteTemplateType } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { DESIGN_GROUPS, DESIGN_OPTIONS } from "@/lib/intake/form";
import { ensureMasterLists } from "@/lib/masters/server";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";
import { TemplateSlot } from "@/models/TemplateSlot";
import { getTheme, SPECIALTY_THEMES } from "@/themes/specialty";
import { TemplateSlotCard, type SlotView } from "./TemplateSlotCard";

export const metadata: Metadata = { title: "Designs & themes" };

const ROW_TITLE: Record<SiteTemplateType, string> = {
  portfolio: "Doctor portfolio layouts",
  clinic: "Clinic site layouts",
  hospital: "Hospital site layouts",
  card: "Visiting card layouts",
};

type Counts = { _id: string; n: number }[];
const countOf = (rows: Counts, key: string) => rows.find((r) => r._id === key)?.n ?? 0;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const isKind = (k: unknown): k is ProductKind => k === "doctor" || k === "clinic" || k === "hospital";

/** The page layouts (design slots) of each product. */
const SITE_TYPE: Record<ProductKind, SiteTemplateType> = { doctor: "portfolio", clinic: "clinic", hospital: "hospital" };
const NOUN: Record<ProductKind, string> = { doctor: "doctors", clinic: "clinics", hospital: "hospitals" };

/**
 * Designs & themes (MEDIREACH_BUILD_PROMPT.md Phase 4.5), split like the
 * public /designs page: Doctors / Clinics / Hospitals (?for=…). Each tab has
 * that product's page layouts (5 slots), the designs applicants see in the
 * website form (clinics and hospitals: per type), the visiting card layouts,
 * the product's card colour styles and its specialty designs. Only "ready"
 * slots can be chosen; the rest fall back to Classic. Themes are
 * configuration (src/themes/specialty.ts), edited in code.
 */
export default async function DesignsAdminPage({ searchParams }: { searchParams: Promise<{ for?: string }> }) {
  await requireAdminPage(rolesFor("/admin/templates"));
  await connectToDatabase();
  await ensureMasterLists();
  const sp = await searchParams;
  const kind: ProductKind = isKind(sp.for) ? sp.for : "doctor";
  const noun = NOUN[kind];
  const group = (field: string, match: Record<string, unknown> = {}) => [{ $match: match }, { $group: { _id: `$${field}`, n: { $sum: 1 } } }];
  const [slots, portfolioUse, doctorCardUse, siteUse, siteCardUse, themeUse] = await Promise.all([
    TemplateSlot.find({ type: { $in: [SITE_TYPE[kind], "card"] } }).sort({ type: 1, key: 1 }).lean(),
    kind === "doctor" ? DoctorProfile.aggregate<Counts[number]>(group("portfolioTemplateId")) : Promise.resolve([]),
    kind === "doctor" ? DoctorProfile.aggregate<Counts[number]>(group("cardTemplateId")) : Promise.resolve([]),
    kind === "doctor" ? Promise.resolve([]) : Establishment.aggregate<Counts[number]>(group("siteTemplateId", { kind })),
    kind === "doctor" ? Promise.resolve([]) : Establishment.aggregate<Counts[number]>(group("cardTemplateId", { kind })),
    kind === "doctor" ? Promise.resolve([]) : Establishment.aggregate<Counts[number]>(group("themeKey", { kind })),
  ]);
  const one = kind === "doctor" ? "doctor" : kind;

  const usage = (type: SiteTemplateType, key: string): string =>
    plural(countOf(type === "card" ? (kind === "doctor" ? doctorCardUse : siteCardUse) : kind === "doctor" ? portfolioUse : siteUse, key), one, noun);
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

  const slotRow = (type: SiteTemplateType, text: string) => (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">{ROW_TITLE[type]}</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">{text}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {view(type).map((s) => (
          <TemplateSlotCard key={`${s.type}-${s.key}`} slot={s} />
        ))}
      </div>
    </section>
  );
  const themes = kind === "doctor" ? [] : SPECIALTY_THEMES.filter((t) => t.kind === kind);

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <KindTabs label="Designs for" active={kind} hrefFor={(k) => `/admin/templates?for=${k}`} />
        <p className="max-w-2xl text-muted-foreground">
          The designs offered to {noun}, the same as on the website&apos;s Designs page and in the {one} website form. Only <strong>ready</strong> designs can be
          chosen; the rest show as “Coming soon” and fall back to Classic. Every design renders the same SEO. Publicly these are called designs, never templates.
        </p>
      </div>

      {slotRow(SITE_TYPE[kind], kind === "doctor" ? "Five portfolio page layouts." : `Five page layouts for ${noun}. Each is coloured by the specialty design chosen for the site.`)}

      {kind === "doctor" ? (
        <section className="space-y-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">In the doctor website form</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">What doctors can pick in Get started → Doctor. Only ready designs can be picked.</p>
          </div>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {DESIGN_OPTIONS.doctor.map((d) => (
              <li key={d.value} className="flex flex-col gap-1 rounded-xl border border-line bg-card p-3 shadow-soft">
                <p className="font-semibold text-ink">{d.label}</p>
                <p className="text-xs text-muted-foreground">{d.ready ? "Ready" : "Coming soon"}</p>
                {d.ready && (
                  <a href={d.sampleHref} target="_blank" rel="noopener" className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-semibold text-ink hover:underline">
                    <ExternalLink className="size-3.5" /> View sample
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="space-y-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">In the {kind} website form, by type</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Applicants pick the type of {kind} first, then one of its designs. To add a design, build the theme and add its key to the type in
              <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">src/lib/intake/form.ts</code>.
            </p>
          </div>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {DESIGN_GROUPS[kind].map((g) => (
              <li key={g.value} className="space-y-2 rounded-xl border border-line bg-card p-3 shadow-soft">
                <p className="font-semibold text-ink">{g.label}</p>
                <ul className="grid grid-cols-3 gap-2">
                  {g.designs.map((d) => (
                    <li key={d.value} className="min-w-0 space-y-1">
                      <div className={d.ready ? "" : "opacity-40 grayscale"}>
                        <ThemeMiniPreview theme={getTheme(d.ready ? d.value : g.themeKey, kind)} />
                      </div>
                      <p className="truncate text-xs font-medium text-ink">{d.label}</p>
                      {d.ready ? (
                        <a href={d.sampleHref} target="_blank" rel="noopener" className="block truncate text-xs text-muted-foreground hover:text-ink hover:underline">
                          {d.sub}
                        </a>
                      ) : (
                        <p className="text-xs text-muted-foreground">Coming soon</p>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      {slotRow("card", `Card layouts are shared by doctors, clinics and hospitals; usage here counts ${noun}.`)}

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Visiting card colours for {noun}</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            The style codes {noun} can pick on the website and in their form. They live in
            <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">src/lib/cards/styles.ts</code>.
          </p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CARD_STYLES_BY_GROUP[kind].map((s) => (
            <li key={s.code} className="flex items-center gap-3 rounded-xl border border-line bg-card p-3 shadow-soft">
              <span aria-hidden className="flex shrink-0 -space-x-1.5">
                {s.swatches.map((c, i) => (
                  <span key={i} className="size-6 rounded-full border-2 border-white shadow-sm" style={{ background: c }} />
                ))}
              </span>
              <span className="min-w-0">
                <span className="block font-mono text-sm font-semibold">{s.code}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {s.name} · {s.colours}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {themes.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">Specialty designs for {noun}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Colours, icon, section order and suggested services. Read-only here: they live in
              <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">src/themes/specialty.ts</code>.
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {themes.map((t) => (
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
                <p className="text-xs text-muted-foreground">{plural(countOf(themeUse, t.key), one, noun)}</p>
                <a href={`/designs/${t.key}`} target="_blank" rel="noopener" className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-ink hover:underline">
                  <ExternalLink className="size-3.5" /> View sample
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
