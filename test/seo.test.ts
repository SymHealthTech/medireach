import { describe, expect, it } from "vitest";
import {
  introSentence,
  profileBreadcrumbs,
  profileDescription,
  listingDescription,
  listingTitle,
  profileJsonLd,
  profileTitle,
  quickFacts,
  truncate,
} from "@/lib/seo/profile";
import { sanitizeBioHtml, bioText } from "@/lib/sanitize";
import { formatSlots, isOpenAt, nowInIndia, openDaysSummary, openingHoursSpecification, weekSummary } from "@/lib/timings";
import { doctorVcard } from "@/lib/vcard";
import type { PublicDoctor } from "@/templates/types";

const SITE = "http://localhost:3000";

function doctor(overrides: Partial<PublicDoctor> = {}): PublicDoctor {
  return {
    id: "1",
    citySlug: "pune",
    slug: "dr-amit-shah-general-physician",
    url: `${SITE}/pune/doctor/dr-amit-shah-general-physician`,
    websiteUrl: `${SITE}/pune/doctor/dr-amit-shah-general-physician`,
    shareUrl: `${SITE}/dr-amit-shah`,
    vcfUrl: `${SITE}/pune/doctor/dr-amit-shah-general-physician/contact.vcf`,
    title: "Dr.",
    firstName: "Amit",
    lastName: "Shah",
    fullName: "Dr. Amit Shah",
    languages: ["English", "Marathi"],
    systemOfMedicine: "allopathy",
    registration: { council: "Maharashtra Medical Council", number: "2010/01/0001" },
    qualifications: [{ degree: "MBBS", institute: "BJ Medical College", year: 2008 }],
    degreesLine: "MBBS, MD",
    practitionerType: "gp",
    primarySpecialty: { name: "General Physician", slug: "general-physician", plural: "General Physicians" },
    secondarySpecialties: [],
    services: [{ name: "Diabetes care" }],
    conditionsTreated: [],
    clinics: [
      {
        id: "c1",
        name: "Shah Clinic",
        type: "own_clinic",
        addressLine1: "1 FC Road",
        area: { name: "Kothrud", slug: "kothrud" },
        city: { name: "Pune", slug: "pune" },
        state: "Maharashtra",
        pincode: "411038",
        fullAddress: "1 FC Road, Kothrud, Pune 411038, Maharashtra",
        directionsUrl: "https://maps.example",
        timings: [1, 2, 3].map((day) => ({ day, slots: [{ open: "10:00", close: "13:00" }] })),
      },
    ],
    phone: "919800000001",
    links: { website: "https://example.com" },
    awards: [],
    memberships: [],
    publications: [],
    interests: [],
    gallery: [],
    portfolioTemplateId: "classic",
    seo: { noindex: false },
    updatedAt: "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("profile title", () => {
  it("uses the full pattern when it fits in 60 chars", () => {
    const t = profileTitle(doctor({ primarySpecialty: { name: "Dentist", slug: "dentist", plural: "Dentists" } }));
    expect(t).toBe("Dr. Amit Shah – Dentist in Kothrud, Pune | MediReach");
  });

  it("drops '| MediReach' first, then the city", () => {
    expect(profileTitle(doctor())).toBe("Dr. Amit Shah – General Physician in Kothrud, Pune");
    const long = doctor({
      fullName: "Dr. Venkatanarasimharajuvaripeta Krishnamurthy",
      primarySpecialty: { name: "General Physician", slug: "general-physician", plural: "General Physicians" },
    });
    const t = profileTitle(long);
    expect(t.length).toBeLessThanOrEqual(60);
    expect(t.startsWith("Dr. Venkatanarasimharajuvaripeta Krishnamurthy")).toBe(true);
  });

  it("respects the SEO override", () => {
    expect(profileTitle(doctor({ seo: { noindex: false, titleOverride: "Custom" } }))).toBe("Custom");
  });
});

describe("profile description", () => {
  it("prefers the short bio", () => {
    expect(profileDescription(doctor({ shortBio: "Family doctor in Kothrud." }))).toBe("Family doctor in Kothrud.");
  });
  it("auto-generates within 155 chars", () => {
    const d = profileDescription(doctor());
    expect(d).toBe(
      "Dr. Amit Shah (MBBS, MD), General Physician at Shah Clinic, Kothrud, Pune. Timings, address, contact and services.",
    );
    expect(d.length).toBeLessThanOrEqual(155);
  });
  it("truncates at a word boundary", () => {
    expect(truncate("one two three four", 12)).toBe("one two…");
  });
});

describe("intro sentence", () => {
  it("follows the template with the right article", () => {
    expect(introSentence(doctor())).toBe(
      "Dr. Amit Shah (MBBS, MD) is a general physician practising at Shah Clinic, Kothrud, Pune.",
    );
    expect(
      introSentence(doctor({ primarySpecialty: { name: "ENT Specialist", slug: "ent-specialist", plural: "ENT Specialists" } })),
    ).toContain("is an ENT specialist");
    expect(
      introSentence(doctor({ primarySpecialty: { name: "Orthopaedic Surgeon", slug: "o", plural: "o" } })),
    ).toContain("is an orthopaedic surgeon");
  });
  it("avoids nested brackets", () => {
    expect(introSentence(doctor({ degreesLine: "MBBS, MD (Medicine)" }))).toBe(
      "Dr. Amit Shah, MBBS, MD (Medicine), is a general physician practising at Shah Clinic, Kothrud, Pune.",
    );
  });
});

describe("breadcrumbs, quick facts and JSON-LD", () => {
  it("builds the full breadcrumb trail", () => {
    expect(profileBreadcrumbs(doctor()).map((c) => c.name)).toEqual([
      "Home",
      "Pune",
      "General Physicians",
      "Kothrud",
      "Dr. Amit Shah",
    ]);
  });

  it("answers quick facts from data", () => {
    const qs = quickFacts(doctor()).map((f) => f.question);
    expect(qs).toContain("Where does Dr. Amit Shah practise?");
    expect(qs).toContain("Which languages does Dr. Amit Shah speak?");
  });

  it("emits Physician + MedicalClinic + BreadcrumbList and never ratings", () => {
    const ld = profileJsonLd(doctor());
    const types = ld["@graph"].map((n) => (n as { "@type": string })["@type"]);
    expect(types).toEqual(["Physician", "MedicalClinic", "BreadcrumbList"]);
    const json = JSON.stringify(ld);
    expect(json).not.toMatch(/aggregateRating|"review"/i);
    expect(json).toContain('"identifier"');
    expect(json).toContain("https://schema.org/PrimaryCare");
  });

  it("joins the website (subdomain) and the MediReach listing as one doctor", () => {
    const d = doctor({ subdomain: "dramitshah", websiteUrl: "http://dramitshah.localhost:3000" });
    const site = profileJsonLd(d, "website");
    const listing = profileJsonLd(d, "listing");
    const types = (ld: typeof site) => ld["@graph"].map((n) => (n as { "@type": string })["@type"]);
    // The website names itself (not MediReach); only the listing carries MediReach's breadcrumbs.
    expect(types(site)).toEqual(["Physician", "MedicalClinic", "WebSite"]);
    expect(types(listing)).toEqual(["Physician", "MedicalClinic", "ProfilePage", "BreadcrumbList"]);
    const physician = (ld: typeof site) => ld["@graph"][0] as { "@id": string; url: string; sameAs: string[] };
    expect(physician(site)["@id"]).toBe("http://dramitshah.localhost:3000#physician");
    expect(physician(listing)["@id"]).toBe(physician(site)["@id"]);
    expect(physician(listing).url).toBe("http://dramitshah.localhost:3000");
    expect(physician(site).sameAs).toContain(d.url);
  });

  it("gives the listing its own title and description", () => {
    const d = doctor({ subdomain: "dramitshah", websiteUrl: "http://dramitshah.localhost:3000" });
    expect(listingTitle(d)).toBe("Dr. Amit Shah, General Physician, Kothrud, Pune | MediReach");
    expect(listingTitle(d)).not.toBe(profileTitle(d));
    expect(listingTitle(d).length).toBeLessThanOrEqual(60);
    expect(listingDescription(d)).toMatch(/^MediReach listing of Dr\. Amit Shah, General Physician at /);
  });
});

describe("timings", () => {
  const t = [
    { day: 1, slots: [{ open: "10:00", close: "13:30" }, { open: "18:00", close: "21:00" }] },
    { day: 2, slots: [{ open: "10:00", close: "13:30" }, { open: "18:00", close: "21:00" }] },
  ];
  it("formats slots", () => {
    expect(formatSlots(t[0]!.slots)).toBe("10 am – 1:30 pm, 6 pm – 9 pm");
    expect(formatSlots([])).toBe("Closed");
  });
  it("summarises open days for cards", () => {
    expect(openDaysSummary(t)).toBe("Mon, Tue · 10 am – 1:30 pm, 6 pm – 9 pm");
    const sixDays = [1, 2, 3, 4, 5, 6].map((day) => ({ day, slots: [{ open: "10:00", close: "13:00" }] }));
    expect(openDaysSummary(sixDays)).toBe("Mon–Sat · 10 am – 1 pm");
    expect(openDaysSummary([1, 3, 5].map((day) => ({ day, slots: [{ open: "17:00", close: "20:30" }] })))).toBe("Mon, Wed, Fri · 5 pm – 8:30 pm");
    expect(openDaysSummary([])).toBe("");
  });

  it("summarises the week", () => {
    expect(weekSummary(t)).toBe("Mon–Tue: 10 am – 1:30 pm, 6 pm – 9 pm · Wed–Sun: Closed");
  });
  it("knows when a clinic is open in India time", () => {
    // Monday 2026-11-16 11:00 IST = 05:30 UTC.
    const at = nowInIndia(new Date("2026-11-16T05:30:00Z"));
    expect(at).toEqual({ day: 1, minutes: 660 });
    expect(isOpenAt(t, at)).toBe(true);
    expect(isOpenAt(t, { day: 1, minutes: 14 * 60 })).toBe(false);
  });
  it("groups opening hours for schema.org", () => {
    expect(openingHoursSpecification(t)).toHaveLength(2);
  });
});

describe("bio sanitiser", () => {
  it("keeps only allowed formatting", () => {
    expect(sanitizeBioHtml('<p class="x" onclick="evil()">Hi <b>there</b></p><script>alert(1)</script><img src=x onerror=y>')).toBe(
      "<p>Hi <b>there</b></p>",
    );
    expect(sanitizeBioHtml('<a href="javascript:alert(1)">link</a> & 5 < 6')).toBe("link &amp; 5 &lt; 6");
    expect(sanitizeBioHtml("<ul><li>One</li></ul>&amp;")).toBe("<ul><li>One</li></ul>&amp;");
  });
  it("extracts plain text", () => {
    expect(bioText("<p>One</p><p>Two &amp; three</p>")).toBe("One Two & three");
  });
});

describe("vCard", () => {
  it("escapes values and uses CRLF", () => {
    const v = doctorVcard(doctor());
    expect(v.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n")).toBe(true);
    expect(v).toContain("FN:Dr. Amit Shah\r\n");
    expect(v).toContain("TEL;TYPE=CELL,VOICE:+919800000001");
    expect(v).toContain("NOTE:MBBS\\, MD");
    expect(v.trimEnd().endsWith("END:VCARD")).toBe(true);
  });
});
