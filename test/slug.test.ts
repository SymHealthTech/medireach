import { describe, expect, it } from "vitest";
import {
  doctorShortSlugBase,
  doctorSlug,
  masterSlugError,
  shortSlugCandidates,
  slugify,
  subdomainError,
} from "@/lib/slug";

describe("slug helpers", () => {
  it("slugifies names", () => {
    expect(slugify("Karve Nagar")).toBe("karve-nagar");
    expect(slugify("  Oral & Maxillofacial Surgeon ")).toBe("oral-and-maxillofacial-surgeon");
    expect(slugify("MD (Ayurveda)")).toBe("md-ayurveda");
    expect(slugify("Renée D'Souza")).toBe("renee-d-souza");
  });

  it("builds canonical and short doctor slugs", () => {
    expect(doctorSlug("Amit", "Shah", "general-physician")).toBe("dr-amit-shah-general-physician");
    expect(doctorShortSlugBase("Amit", "Shah")).toBe("dr-amit-shah");
  });

  it("yields short-slug fallbacks in order", () => {
    const gen = shortSlugCandidates("Amit", "Shah", "kothrud");
    expect([gen.next().value, gen.next().value, gen.next().value, gen.next().value]).toEqual([
      "dr-amit-shah",
      "dr-amit-shah-kothrud",
      "dr-amit-shah-2",
      "dr-amit-shah-3",
    ]);
  });

  it("rejects master slugs that collide with routes", () => {
    expect(masterSlugError("city", "pune")).toBeNull();
    expect(masterSlugError("city", "admin")).not.toBeNull();
    expect(masterSlugError("city", "dr-pune")).not.toBeNull();
    expect(masterSlugError("specialty", "area")).not.toBeNull();
    expect(masterSlugError("specialty", "doctor")).not.toBeNull();
    expect(masterSlugError("area", "Kothrud")).not.toBeNull();
    expect(masterSlugError("area", "kothrud")).toBeNull();
  });

  it("reserves the clinic, hospital and design routes", () => {
    for (const city of ["designs", "for-clinics", "for-hospitals", "clinic", "clinics", "hospital", "hospitals", "doctor", "area", "pricing"]) {
      expect(masterSlugError("city", city), city).not.toBeNull();
    }
    for (const specialty of ["clinic", "clinics", "hospital", "hospitals", "doctor", "area"]) {
      expect(masterSlugError("specialty", specialty), specialty).not.toBeNull();
    }
    expect(masterSlugError("specialty", "dermatologist")).toBeNull();
  });

  it("validates subdomains", () => {
    expect(subdomainError("amit")).toBeNull();
    expect(subdomainError("amit-shah")).toBeNull();
    expect(subdomainError("am")).not.toBeNull();
    expect(subdomainError("www")).not.toBeNull();
    expect(subdomainError("-amit")).not.toBeNull();
    expect(subdomainError("amit--shah")).not.toBeNull();
    expect(subdomainError("Amit")).not.toBeNull();
  });
});
