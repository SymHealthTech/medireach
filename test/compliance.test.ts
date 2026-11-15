import { describe, expect, it } from "vitest";
import { htmlToText, scanFields, scanText } from "@/lib/compliance/scan";

const phrases = (text: string) => scanText(text).map((m) => m.match.toLowerCase());

describe("NMC compliance scanner", () => {
  it("flags superlatives case-insensitively", () => {
    expect(phrases("The BEST paediatrician in Kothrud")).toEqual(["best"]);
    expect(phrases("Renowned and Most Trusted surgeon")).toEqual(["renowned", "most trusted"]);
  });

  it("matches whole words only", () => {
    expect(phrases("Bestowed a fellowship; topical treatment")).toEqual([]);
  });

  it("handles symbol phrases and spacing variants", () => {
    expect(phrases("Pune's #1 clinic")).toEqual(["#1"]);
    expect(phrases("100% safe treatment")).toEqual(["100%"]);
    expect(phrases("100% results")).toEqual(["100% results"]);
    expect(phrases("No.1 dentist")).toEqual(["no.1"]);
    expect(phrases("No.  1 dentist")).toEqual(["no.  1"]);
    expect(phrases("number one choice")).toEqual(["number one"]);
  });

  it("reports the longer phrase once when phrases overlap", () => {
    expect(phrases("Permanent cure for migraine")).toEqual(["permanent cure"]);
    expect(phrases("Cure guaranteed")).toEqual(["cure guaranteed"]);
  });

  it("flags patient counts and success rates", () => {
    expect(phrases("Has treated 10,000 patients")).toEqual(["treated 10,000 patients"]);
    expect(phrases("Treated over 5000 patients")).toEqual(["treated over 5000 patients"]);
    expect(phrases("5000+ surgeries performed")).toEqual(["5000+ surgeries"]);
    expect(phrases("99% success rate")).toEqual(["99% success"]);
    expect(phrases("99.5 % recovery")).toEqual(["99.5 % recovery"]);
  });

  it("leaves factual text alone", () => {
    expect(
      phrases("MBBS, MD (Medicine). In practice since 2009. Consults at Sahyadri Hospital, Kothrud."),
    ).toEqual([]);
  });

  it("returns positions usable for highlighting", () => {
    const [m] = scanText("A miracle doctor");
    expect(m).toMatchObject({ phrase: "miracle", index: 2, length: 7 });
  });

  it("accepts an overridden phrase list", () => {
    expect(scanText("sabse accha doctor", ["sabse accha"]).map((m) => m.match)).toEqual(["sabse accha"]);
    expect(scanText("best doctor", ["sabse accha"])).toHaveLength(0);
  });

  it("scans fields and dedupes per field", () => {
    expect(
      scanFields({
        shortBio: "Best care. The best.",
        fullBio: htmlToText("<p><b>Leading</b> cardiologist</p>"),
        "gallery.0.caption": "Clinic reception",
        "awards.0.title": undefined,
      }),
    ).toEqual([
      { field: "shortBio", phrase: "Best" },
      { field: "fullBio", phrase: "Leading" },
    ]);
  });
});
