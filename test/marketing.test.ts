import { describe, expect, it } from "vitest";
import { allMarketingCopy, FOOTER, NAV } from "@/content/marketing";
import { LEAD_SOURCE_LABEL } from "@/lib/admin/labels";
import { LEAD_SOURCES } from "@/lib/constants";
import { scanText } from "@/lib/compliance/scan";
import { RESERVED_SLUGS } from "@/config/reserved";
import { MARKETING_PATHS } from "@/lib/public/sitemap";

describe("marketing copy", () => {
  it("collects a meaningful amount of copy", () => {
    expect(allMarketingCopy().length).toBeGreaterThan(50);
  });

  it("contains none of the banned phrases", () => {
    const hits = allMarketingCopy().flatMap((t) => scanText(t).map((m) => `${m.phrase} in "${t}"`));
    expect(hits).toEqual([]);
  });

  it("makes no unverifiable claims about MediReach", () => {
    const text = allMarketingCopy().join(" ").toLowerCase();
    for (const claim of ["#1", "number one", "best ", "leading", "guaranteed", "top-rated"]) expect(text).not.toContain(claim);
  });
});

describe("marketing routes", () => {
  it("reserves every marketing and sample path as a city slug", () => {
    for (const p of [...MARKETING_PATHS.filter((x) => x !== "/"), "/login", "/sample"]) expect(RESERVED_SLUGS).toContain(p.slice(1));
  });

  it("lists the product pages and moves /hospitals to /for-hospitals for good", async () => {
    expect(MARKETING_PATHS).toEqual(expect.arrayContaining(["/pricing", "/for-doctors", "/for-clinics", "/for-hospitals", "/designs", "/terms"]));
    expect(MARKETING_PATHS).not.toContain("/hospitals");
    const config = (await import("../next.config.mjs")).default;
    const redirects = await config.redirects!();
    expect(redirects).toContainEqual({ source: "/hospitals", destination: "/for-hospitals", statusCode: 301 });
  });

  it("points the top bar and footer at the product pages", () => {
    expect(NAV.map((n) => n.href)).toEqual(["/for-doctors", "/for-clinics", "/for-hospitals", "/visiting-cards", "/pricing", "/login"]);
    const footerLinks = FOOTER.columns.flatMap((c) => c.links.map((l) => l.href));
    expect(footerLinks).toEqual(expect.arrayContaining(["/for-doctors", "/for-clinics", "/for-hospitals", "/pricing", "/terms", "/privacy"]));
  });

  it("accepts and labels leads from the clinics page", () => {
    expect(LEAD_SOURCES).toContain("clinics");
    for (const s of LEAD_SOURCES) expect(LEAD_SOURCE_LABEL[s]).toBeTruthy();
  });
});
