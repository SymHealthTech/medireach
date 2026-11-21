import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

beforeAll(() => {
  process.env.AUTH_SESSION_SECRET = "test-secret-test-secret-test-secret-123";
});

const { createPreviewToken, readPreviewToken, previewUrl } = await import("@/lib/preview-link");
const doctorForm = await import("@/lib/doctors/form");
const siteForm = await import("@/lib/establishments/form");

describe("preview links", () => {
  it("round-trips doctor and site targets, and rejects tampering", async () => {
    const id = "6b01b9b28bd1e3cec19cfe6c";
    const d = await createPreviewToken({ kind: "doctor", id });
    const s = await createPreviewToken({ kind: "site", id });
    expect(await readPreviewToken(d)).toEqual({ kind: "doctor", id });
    expect(await readPreviewToken(s)).toEqual({ kind: "site", id });
    expect(await readPreviewToken(`${d.slice(0, -2)}xx`)).toBeNull();
    expect(await readPreviewToken("not-a-token")).toBeNull();
    expect(previewUrl(d)).toMatch(/\/preview\/[\w-]+\.[\w-]+\.[\w-]+$/);
  });

  it("is not a login: a session-style token signed with the plain secret doesn't open a preview", async () => {
    const { SignJWT } = await import("jose");
    const forged = await new SignJWT({ k: "d" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("6b01b9b28bd1e3cec19cfe6c")
      .setAudience("medireach-preview")
      .setExpirationTime("1d")
      .sign(new TextEncoder().encode(process.env.AUTH_SESSION_SECRET));
    expect(await readPreviewToken(forged)).toBeNull();
  });
});

describe("editor steps", () => {
  it("puts Design before Business, and Review last, for doctors and sites", () => {
    const order = (steps: readonly { key: string }[]) => steps.map((s) => s.key).slice(-3);
    expect(order(doctorForm.STEPS)).toEqual(["templates", "business", "review"]);
    expect(order(siteForm.STEPS)).toEqual(["design", "business", "review"]);
  });

  it("asks for the source on hospitals only, and saves the sales executive ID with Business", () => {
    const clinic = siteForm.emptyEstablishmentForm("clinic");
    const hospital = siteForm.emptyEstablishmentForm("hospital");
    expect(siteForm.stepComplete("business", clinic)).toBe(true);
    expect(siteForm.stepComplete("business", hospital)).toBe(false);
    expect(siteForm.stepComplete("business", { ...hospital, source: "field" })).toBe(true);

    const payload = siteForm.sectionPayload("business", { ...clinic, salesExecutive: "Ravi", salesExecutiveId: "MR-S-014" }) as Record<string, unknown>;
    expect(payload).toMatchObject({ salesExecutive: "Ravi", salesExecutiveId: "MR-S-014" });
    expect(siteForm.sectionSchemas.business.parse(payload)).toMatchObject({ salesExecutiveId: "MR-S-014" });

    const doc = doctorForm.emptyDoctorForm();
    expect(doctorForm.stepComplete("business", doc)).toBe(Boolean(doc.plan));
    const dp = doctorForm.sectionPayload("business", { ...doc, salesExecutiveId: "MR-S-002" }) as Record<string, unknown>;
    expect(doctorForm.sectionSchemas.business.parse(dp)).toMatchObject({ salesExecutiveId: "MR-S-002" });
  });
});
