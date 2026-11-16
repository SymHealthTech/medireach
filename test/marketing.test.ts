import { describe, expect, it } from "vitest";
import { allMarketingCopy } from "@/content/marketing";
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
});
