import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { splitClinics } from "@/templates/shared/clinic-split";
import { PHOTO_SETS, photoGroupFor, specialtyPhotos } from "@/templates/shared/specialty-photos";
import type { PublicClinic } from "@/templates/types";

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

describe("own clinics vs visited hospitals", () => {
  const clinic = (id: string, type: PublicClinic["type"]) => ({ id, type }) as PublicClinic;
  it("shows own clinics in full and lists hospital visits briefly", () => {
    const r = splitClinics([clinic("a", "own_clinic"), clinic("h", "hospital_visiting"), clinic("b", "other")]);
    expect(r.main.map((c) => c.id)).toEqual(["a", "b"]);
    expect(r.visiting.map((c) => c.id)).toEqual(["h"]);
  });
  it("shows the first hospital in full when the doctor only visits hospitals", () => {
    const r = splitClinics([clinic("h1", "hospital_visiting"), clinic("h2", "hospital_visiting")]);
    expect(r.main.map((c) => c.id)).toEqual(["h1"]);
    expect(r.visiting.map((c) => c.id)).toEqual(["h2"]);
  });
});
