import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PHOTO_SETS, photoGroupFor, specialtyPhotos } from "@/templates/shared/specialty-photos";

const spec = (slug: string) => ({ slug, name: slug, plural: slug });
const doc = (primary?: string, secondary: string[] = [], systemOfMedicine?: string) => ({
  primarySpecialty: primary ? spec(primary) : undefined,
  secondarySpecialties: secondary.map(spec),
  ...(systemOfMedicine ? { systemOfMedicine } : {}),
});

describe("photos by specialty", () => {
  it("picks the set for the primary specialty first, then the others, then the system of medicine", () => {
    expect(photoGroupFor(doc("dermatologist"))).toBe("skin");
    expect(photoGroupFor(doc("paediatrician", ["neonatologist"]))).toBe("kids");
    expect(photoGroupFor(doc("general-physician", ["cardiologist"]))).toBe("heart");
    expect(photoGroupFor(doc("gynaecologist", ["dermatologist"]))).toBe("women");
    expect(photoGroupFor(doc("dentist"))).toBe("dental");
    expect(photoGroupFor(doc("ophthalmologist"))).toBe("eye");
    expect(photoGroupFor(doc("ent-specialist"))).toBe("ent");
    expect(photoGroupFor(doc("psychiatrist"))).toBe("mind");
    expect(photoGroupFor(doc("general-physician", [], "ayurveda"))).toBe("ayurveda");
    expect(photoGroupFor(doc("general-physician"))).toBeUndefined();
  });

  it("falls back to the design's own photos, else general clinic photos", () => {
    const own = { ...PHOTO_SETS.general, key: "general" as const, band: { src: "/own.jpg", alt: "own" } };
    expect(specialtyPhotos(doc("general-physician"), own).band.src).toBe("/own.jpg");
    expect(specialtyPhotos(doc("general-physician")).key).toBe("general");
    expect(specialtyPhotos(doc("orthopaedic-surgeon"), own).key).toBe("ortho");
  });

  it("has every photo file on disk", () => {
    for (const set of Object.values(PHOTO_SETS)) {
      expect(set.hero).toHaveLength(4);
      for (const p of [...set.hero, set.band, set.side, set.feature]) expect(existsSync(path.join("public", p.src)), p.src).toBe(true);
    }
  });
});
