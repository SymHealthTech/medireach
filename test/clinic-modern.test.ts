import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DEMO_DOCTORS, DEMO_PUBLIC_DOCTORS } from "@/fixtures/demo-doctors";
import { SAMPLE_PUBLIC_DOCTORS } from "@/fixtures/sample-public";
import { autoExcerpt, readMinutes, toPublicBlog, uniqueBlogSlug } from "@/lib/blog";
import { scanFields } from "@/lib/compliance/scan";
import { aboutToHtml, blogPostSchema, htmlToAbout, profileSchema } from "@/lib/doctors/self-profile";
import { inquirySchema } from "@/lib/inquiries";
import { cardProps } from "@/lib/cards/render";
import { SAMPLE_SUBDOMAINS, RESERVED_SUBDOMAINS } from "@/config/reserved";
import { SAMPLE_DESIGNS } from "@/lib/sample-designs";
import ClinicModernPortfolio from "@/templates/portfolio/t2";
import CardT2 from "@/templates/card/t2";
import type { PublicDoctor } from "@/templates/types";

const demo = DEMO_PUBLIC_DOCTORS["arnav-deshpande"]!;
// next/image URL-encodes local paths in srcsets; decode so tests can look for plain paths.
const render = (d: PublicDoctor) =>
  renderToStaticMarkup(createElement(ClinicModernPortfolio, { doctor: d, seo: { heading: createElement("h1", null, d.fullName), intro: "INTRO" } })).replace(/%2F/gi, "/");

describe("demo doctors (fixtures/demo-doctors)", () => {
  it("are published as samples on design 2, with a reserved subdomain", () => {
    expect(SAMPLE_PUBLIC_DOCTORS["arnav-deshpande"]).toBe(demo);
    expect(demo.portfolioTemplateId).toBe("t2");
    expect(SAMPLE_SUBDOMAINS[demo.subdomain!]).toBe("arnav-deshpande");
    expect(RESERVED_SUBDOMAINS as readonly string[]).toContain(demo.subdomain);
    expect(SAMPLE_DESIGNS.find((d) => d.key === "t2")).toMatchObject({ ready: true, sample: "arnav-deshpande" });
    expect(demo.registration.number).toMatch(/^DEMO-/);
    expect(demo.seo.noindex).toBe(true);
  });

  it("pass the NMC wording check everywhere", () => {
    for (const d of DEMO_DOCTORS) {
      const fields: Record<string, string> = {
        shortBio: d.shortBio,
        fullBio: d.fullBio,
        story: `${d.interestsStory.title} ${d.interestsStory.body}`,
        services: d.services.map((s) => `${s.name}. ${s.description}`).join(" "),
        conditions: d.conditionsTreated.join(", "),
        awards: d.awards.map((a) => a.title).join(", "),
        ...Object.fromEntries(d.blog.map((p) => [`blog:${p.slug}`, `${p.title} ${p.excerpt} ${p.body}`])),
        ...Object.fromEntries(d.clinics.map((c, i) => [`clinic:${i}`, c.appointmentNote ?? ""])),
      };
      expect(scanFields(fields)).toEqual([]);
    }
  });

  it("have a full page: blog, gallery within the limit, story and clinics", () => {
    expect(demo.blog?.length).toBe(3);
    expect(demo.blog![0]!.publishedAt >= demo.blog![1]!.publishedAt).toBe(true);
    expect(demo.gallery.length).toBeLessThanOrEqual(5);
    expect(demo.interestsStory?.paragraphs.length).toBeGreaterThan(2);
    expect(demo.clinics.map((c) => c.type)).toEqual(["own_clinic", "hospital_visiting"]);
  });
});

describe("Clinic Modern portfolio (design 2)", () => {
  const html = render(demo);

  it("renders every section with the doctor's details", () => {
    for (const id of ["about", "services", "education", "clinics", "appointment", "recognition", "beyond", "blog", "gallery", "faq"]) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain("Dr. Arnav Deshpande");
    expect(html).toContain("Deshpande Family Clinic");
    expect(html).toContain("Monsoon fevers in Pune: when to see a doctor");
    expect(html).toContain("/templates/clinic-modern/hero-1.jpg");
    expect(html).toContain('name="doctorId" value="demo-arnav-deshpande"');
    // Two clinics → a clinic picker on the form.
    expect(html).toContain('name="clinicId"');
  });

  it("shows no ratings or testimonials, and hides empty sections", () => {
    expect(html.toLowerCase()).not.toMatch(/testimonial|\bratings?\b|\bstars?\b|★/);
    const bare = render({ ...demo, blog: [], gallery: [], awards: [], memberships: [], publications: [], interests: [], interestsPhoto: undefined, interestsStory: undefined, services: [] });
    for (const id of ["blog", "gallery", "recognition", "beyond", "services"]) expect(bare).not.toContain(`id="${id}"`);
    expect(bare).toContain('id="appointment"');
  });

  it("gives each service a different photo", () => {
    const photos = [...html.matchAll(/\/templates\/clinic-modern\/(svc-[a-z]+)\.jpg/g)].map((m) => m[1]);
    expect(new Set(photos).size).toBe(Math.min(demo.services.length, 9));
  });
});

describe("Clinic Modern visiting card", () => {
  it("renders print and phone with the QR address", () => {
    for (const variant of ["print", "phone"] as const) {
      const out = renderToStaticMarkup(createElement(CardT2, cardProps({ ...demo, photo: undefined }, variant, "html")));
      expect(out).toContain("Dr. Arnav Deshpande");
      expect(out).toContain("drarnavdeshpande.");
      expect(out).toContain("General Physician");
    }
  });
});

describe("blog helpers", () => {
  it("make unique slugs, excerpts and reading times", () => {
    expect(uniqueBlogSlug("Monsoon fever!", ["monsoon-fever"])).toBe("monsoon-fever-2");
    expect(uniqueBlogSlug("Monsoon fever!", [])).toBe("monsoon-fever");
    expect(autoExcerpt("word ".repeat(100), 30).endsWith("…")).toBe(true);
    expect(readMinutes("word ".repeat(450))).toBe(2);
  });

  it("shows only published posts, newest first", () => {
    const out = toPublicBlog(
      [
        { slug: "a", title: "A", body: "Old", status: "published", publishedAt: "2026-01-01" },
        { slug: "b", title: "B", body: "Draft", status: "draft" },
        { slug: "c", title: "C", body: "New\n\nSecond", status: "published", publishedAt: "2026-05-01" },
      ],
      "Dr. X",
    );
    expect(out.map((p) => p.slug)).toEqual(["c", "a"]);
    expect(out[0]!.paragraphs).toEqual(["New", "Second"]);
  });

  it("validates articles", () => {
    const ok = blogPostSchema.safeParse({ id: "", title: "Checking BP at home", excerpt: "", body: "x ".repeat(150), tags: "BP, Heart", cover: null, publish: true });
    expect(ok.success && ok.data.tags).toEqual(["BP", "Heart"]);
    expect(blogPostSchema.safeParse({ id: "", title: "Hi", body: "short", tags: "", cover: null, publish: true }).success).toBe(false);
    const outside = { publicId: "x", url: "https://evil.example/x.jpg" };
    expect(blogPostSchema.safeParse({ id: "", title: "Checking BP at home", body: "x ".repeat(150), tags: "", cover: outside, publish: false }).success).toBe(false);
  });
});

describe("doctor self-edit profile", () => {
  it("turns about text into safe HTML and back", () => {
    const text = "First paragraph with <b>tags</b>.\n\n- One\n- Two & three\n\nLast line.";
    const html = aboutToHtml(text);
    expect(html).toBe("<p>First paragraph with &lt;b&gt;tags&lt;/b&gt;.</p><ul><li>One</li><li>Two &amp; three</li></ul><p>Last line.</p>");
    expect(htmlToAbout(html)).toBe(text);
    expect(htmlToAbout(demo.fullBioHtml)).toContain("- Long-term care for diabetes, blood pressure and thyroid");
  });

  it("splits lists and checks links", () => {
    const parsed = profileSchema.parse({
      shortBio: "GP",
      about: "",
      services: [{ name: "Diabetes care", description: "" }],
      conditions: "Fever\nDiabetes, Thyroid disorders (hypo, hyper)",
      languages: "English, Hindi",
      interests: "",
      email: "",
      links: { googleBusiness: "", instagram: "", facebook: "", linkedin: "", youtube: "", website: "" },
    });
    expect(parsed.conditions).toEqual(["Fever", "Diabetes", "Thyroid disorders (hypo, hyper)"]);
    expect(parsed.languages).toEqual(["English", "Hindi"]);
    expect(profileSchema.safeParse({ ...parsed, conditions: "", languages: "", interests: "", links: { ...parsed.links, instagram: "instagram.com/x" } }).success).toBe(false);
  });
});

describe("appointment request form", () => {
  const base = { doctorId: "demo-arnav-deshpande", name: "Meera K", phone: "+91 98000 00201", consent: "on" };
  it("accepts a minimal request and normalises the phone", () => {
    const r = inquirySchema.safeParse(base);
    expect(r.success && r.data.phone).toBe("9800000201");
  });
  it("needs consent, a valid mobile and a date that isn't in the past", () => {
    expect(inquirySchema.safeParse({ ...base, consent: undefined }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...base, phone: "12345" }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...base, preferredDate: "2020-01-01" }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...base, website: "spam" }).success).toBe(false);
  });
});
