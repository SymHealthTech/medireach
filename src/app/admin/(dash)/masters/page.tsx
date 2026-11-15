import type { Metadata } from "next";
import Link from "next/link";
import { rolesFor } from "@/components/admin/nav";
import { requireAdminPage } from "@/lib/auth/admin";
import { isObjectId, oneOf, param, searchRegex, type SearchParams } from "@/lib/admin/list";
import { connectToDatabase } from "@/lib/db";
import { cn } from "@/lib/cn";
import { Area } from "@/models/Area";
import { City } from "@/models/City";
import { Council } from "@/models/Council";
import { Degree } from "@/models/Degree";
import { Specialty } from "@/models/Specialty";
import { ListToolbar } from "@/components/admin/ListControls";
import { DeleteMasterButton, MasterDialog, type MasterRow } from "./MasterControls";
import type { MasterKind } from "./actions";

export const metadata: Metadata = { title: "Master lists" };

const TABS: { key: MasterKind; label: string }[] = [
  { key: "city", label: "Cities" },
  { key: "area", label: "Areas" },
  { key: "specialty", label: "Specialties" },
  { key: "degree", label: "Degrees" },
  { key: "council", label: "Councils" },
];

export default async function MastersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage(rolesFor("/admin/masters"));
  await connectToDatabase();
  const sp = await searchParams;
  const tab = oneOf(param(sp, "tab"), TABS.map((t) => t.key)) ?? "city";
  const re = searchRegex(param(sp, "q"));
  const nameFilter = re ? { name: re } : {};

  const cities = await City.find().sort({ name: 1 }).lean();
  const cityParam = param(sp, "city");
  const cityId = isObjectId(cityParam) ? cityParam : String(cities.find((c) => c.slug === "pune")?._id ?? cities[0]?._id ?? "");

  let rows: MasterRow[] = [];
  if (tab === "city") rows = cities.filter((c) => !re || re.test(c.name)).map((c) => ({ id: String(c._id), name: c.name, slug: c.slug, state: c.state }));
  if (tab === "area")
    rows = (await Area.find({ ...nameFilter, ...(cityId ? { cityId } : {}) }).sort({ name: 1 }).lean()).map((a) => ({ id: String(a._id), name: a.name, slug: a.slug, cityId: String(a.cityId) }));
  if (tab === "specialty")
    rows = (await Specialty.find(nameFilter).sort({ name: 1 }).lean()).map((s) => ({ id: String(s._id), name: s.name, slug: s.slug, plural: s.plural, description: s.description }));
  if (tab === "degree") rows = (await Degree.find(nameFilter).sort({ name: 1 }).lean()).map((d) => ({ id: String(d._id), name: d.name, slug: d.slug }));
  if (tab === "council")
    rows = (await Council.find(nameFilter).sort({ name: 1 }).lean()).map((c) => ({ id: String(c._id), name: c.name, slug: c.slug, state: c.state }));

  const cityOptions = cities.map((c) => ({ id: String(c._id), name: c.name }));

  return (
    <div className="space-y-5">
      <p className="text-muted-foreground">Lists used in the doctor form and in public page addresses. Slugs are checked against reserved words.</p>
      <nav aria-label="Lists" className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/masters?tab=${t.key}`}
            className={cn(
              "shrink-0 border-b-2 px-4 py-3 text-sm font-medium",
              tab === t.key ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex-1">
          <ListToolbar
            placeholder={`Search ${TABS.find((t) => t.key === tab)!.label.toLowerCase()}…`}
            filters={tab === "area" ? [{ name: "city", label: "City", options: cityOptions.map((c) => ({ value: c.id, label: c.name })) }] : []}
          />
        </div>
        <MasterDialog key={`${tab}-${cityId}`} kind={tab} cities={cityOptions} defaultCityId={cityId} />
      </div>

      <ul className="divide-y divide-line rounded-xl border border-line bg-card shadow-soft">
        {rows.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">Nothing here yet.</li>}
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-ink">{r.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {[r.slug, r.plural, r.state].filter(Boolean).join(" · ")}
              </span>
            </span>
            <MasterDialog kind={tab} initial={r} cities={cityOptions} />
            <DeleteMasterButton kind={tab} id={r.id!} name={r.name} />
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">{rows.length} shown</p>
    </div>
  );
}
