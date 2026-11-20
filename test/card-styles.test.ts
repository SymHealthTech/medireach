import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cardProps, siteCardProps } from "@/lib/cards/render";
import {
  CARD_STYLES,
  CARD_STYLES_BY_GROUP,
  cardStyleWhatsappText,
  DEFAULT_DOCTOR_CARD_STYLE,
  doctorCardPalette,
  findCardStyle,
  siteCardPalette,
  SITE_CARD_STYLE_CODES,
  DOCTOR_CARD_STYLE_CODES,
} from "@/lib/cards/styles";
import { sectionSchemas as doctorSchemas } from "@/lib/doctors/form";
import { sectionSchemas as siteSchemas } from "@/lib/establishments/form";
import { SAMPLE_PUBLIC_DOCTORS } from "@/fixtures/sample-public";
import { SAMPLE_SITES } from "@/fixtures/sample-sites";
import ClassicCard from "@/templates/card/classic";
import ClassicSiteCard from "@/templates/card/classic/site";

describe("card style catalogue", () => {
  it("has five styles per audience with unique, prefixed code names", () => {
    const prefix = { doctor: "DOC-", clinic: "CLN-", hospital: "HSP-" } as const;
    for (const [group, styles] of Object.entries(CARD_STYLES_BY_GROUP)) {
      expect(styles).toHaveLength(5);
      for (const s of styles) expect(s.code.startsWith(prefix[group as keyof typeof prefix])).toBe(true);
    }
    const codes = CARD_STYLES.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const c of codes) expect(c).toMatch(/^[A-Z]{3}-[A-Z]{3,12}$/);
  });

  it("includes teal and amber in every audience", () => {
    for (const styles of Object.values(CARD_STYLES_BY_GROUP)) {
      expect(styles.some((s) => s.code.endsWith("-TEAL") || s.code.endsWith("-LAGOON"))).toBe(true);
      expect(styles.some((s) => /AMBER|SAFFRON/.test(s.code))).toBe(true);
    }
  });

  it("looks codes up loosely and falls back safely", () => {
    expect(findCardStyle(" doc-amber ")?.code).toBe("DOC-AMBER");
    expect(doctorCardPalette(undefined)).toBe(DEFAULT_DOCTOR_CARD_STYLE.palette);
    expect(doctorCardPalette("CLN-OCEAN")).toBe(DEFAULT_DOCTOR_CARD_STYLE.palette); // wrong group
    expect(siteCardPalette("DOC-AMBER")).toBeUndefined();
    expect(siteCardPalette("HSP-NAVY")?.primary).toBe("#1B3A6B");
    expect(cardStyleWhatsappText("CLN-LEAF")).toContain("CLN-LEAF");
  });

  it("only accepts codes of the right kind in the editors", () => {
    const docTemplates = (cardStyle: string) => doctorSchemas.templates.safeParse({ portfolioTemplateId: "classic", cardTemplateId: "classic", cardStyle });
    expect(docTemplates("DOC-PLUM").success).toBe(true);
    expect(docTemplates("").data?.cardStyle).toBeUndefined();
    expect(docTemplates("CLN-TEAL").success).toBe(false);
    expect(DOCTOR_CARD_STYLE_CODES).toHaveLength(5);
    expect(SITE_CARD_STYLE_CODES).toHaveLength(10);
    const siteShape = siteSchemas.basics.shape.cardStyle;
    expect(siteShape.safeParse("HSP-CRIMSON").success).toBe(true);
    expect(siteShape.safeParse("CLN-BERRY").success).toBe(true);
    expect(siteShape.safeParse("DOC-AMBER").success).toBe(false);
  });
});

describe("cards use the chosen style", () => {
  it("paints the doctor card in the style's colours", () => {
    const d = { ...SAMPLE_PUBLIC_DOCTORS.gp, cardStyle: "DOC-SAPPHIRE" };
    for (const variant of ["print", "phone"] as const) {
      const html = renderToStaticMarkup(createElement(ClassicCard, cardProps(d, variant, "html")));
      expect(html).toContain("#17305E");
      expect(html).not.toContain("#0A3F3F");
    }
    const plain = renderToStaticMarkup(createElement(ClassicCard, cardProps(SAMPLE_PUBLIC_DOCTORS.gp, "print", "html")));
    expect(plain).toContain("#0A3F3F");
  });

  it("paints the clinic card in the style's colours instead of the theme's", () => {
    const s = { ...SAMPLE_SITES["general-opd"], cardStyle: "CLN-BERRY" };
    const html = renderToStaticMarkup(createElement(ClassicSiteCard, siteCardProps(s, "phone", "html")));
    expect(html).toContain("#A3335B");
  });
});
