import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import type { MongoClient } from "mongodb";
import { createRequire } from "node:module";
import { connectToDatabase } from "@/lib/db";
import { loginCodeEmail, loginEmail } from "@/lib/auth/login-email";
import {
  LOGIN_CODE_COLLECTION,
  LOGIN_CODE_MAX_ATTEMPTS,
  checkLoginCode,
  createLoginCode,
  sendLoginCode,
  sessionUrlAfterCode,
} from "@/lib/auth/login-code";
import {
  LOGIN_LINK_LIMIT,
  VERIFICATION_COLLECTION,
  callbackUrlFor,
  createLoginToken,
  hashLoginToken,
  hitLoginLinkLimit,
  loginDoctorFor,
  loginTokenValid,
  sendLoginLink,
} from "@/lib/auth/login-link";
import { accountSchema, accountTextFields } from "@/lib/doctors/account";
import { scanFields } from "@/lib/compliance/scan";
import { DoctorProfile } from "@/models/DoctorProfile";

// NextAuth's own token hash (not in its exports map), to prove our stored tokens are ones it accepts.
const { hashToken: nextAuthHashToken } = createRequire(import.meta.url)("../node_modules/next-auth/core/lib/utils.js") as {
  hashToken: (token: string, options: { provider: { secret?: string }; secret: string }) => string;
};

let mongod: MongoMemoryServer;
const SECRET = "test-secret-test-secret-test-secret-123";

beforeAll(async () => {
  process.env.AUTH_SESSION_SECRET = SECRET;
  delete process.env.NEXTAUTH_SECRET;
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB = "medireach_login_test";
  await connectToDatabase();
  await DoctorProfile.create({ firstName: "Asha", lastName: "Kulkarni", ownerEmail: "Asha@Example.com" });
  await DoctorProfile.create({ firstName: "No", lastName: "Login" });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const tokens = () => mongoose.connection.collection(VERIFICATION_COLLECTION);

describe("login email", () => {
  it("is branded, escapes the name and has a plain-text fallback", () => {
    const m = loginEmail({ name: "Dr. <b>Asha</b>", url: "https://medireach.co.in/login/verify?token=abc&email=a%40b.c" });
    expect(m.subject).toBe("Your MediReach login link");
    expect(m.html).toContain("Log in to MediReach");
    expect(m.html).toContain("Dr. &lt;b&gt;Asha&lt;/b&gt;");
    expect(m.html).toContain("token=abc&amp;email=a%40b.c");
    expect(m.html).toContain("Didn't request this? Ignore this email.");
    expect(m.text).toContain("https://medireach.co.in/login/verify?token=abc&email=a%40b.c");
    expect(m.text).toContain("Didn't request this? Ignore this email.");
    expect(loginEmail({ name: "x", url: "u", welcome: true }).subject).toBe("Manage your MediReach page");
  });
});

describe("login links", () => {
  it("only matches a doctor's ownerEmail (case-insensitive)", async () => {
    expect(await loginDoctorFor("  ASHA@example.com ")).not.toBeNull();
    expect(await loginDoctorFor("someone@example.com")).toBeNull();
  });

  it("sends nothing and stores nothing for unknown emails", async () => {
    const before = await tokens().countDocuments();
    expect(await sendLoginLink("someone@example.com")).toBeNull();
    expect(await tokens().countDocuments()).toBe(before);
  });

  it("stores only a hash, in the format NextAuth's Email provider verifies", async () => {
    const sent = await sendLoginLink("asha@example.com");
    expect(sent).not.toBeNull();
    const url = new URL(sent!.url);
    expect(url.pathname).toBe("/login/verify");
    const raw = url.searchParams.get("token")!;
    expect(raw).toMatch(/^[a-f0-9]{64}$/);
    expect(url.searchParams.get("email")).toBe("asha@example.com");

    const stored = await tokens().findOne({ identifier: "asha@example.com" });
    expect(stored?.token).not.toBe(raw);
    expect(stored?.token).toBe(hashLoginToken(raw));
    expect(stored?.token).toBe(nextAuthHashToken(raw, { provider: {}, secret: SECRET }));
    const ttl = (stored!.expires as Date).getTime() - Date.now();
    expect(ttl).toBeGreaterThan(23.9 * 3600_000);
    expect(ttl).toBeLessThanOrEqual(24 * 3600_000);
    expect(await loginTokenValid(raw, "asha@example.com")).toBe(true);
    expect(await loginTokenValid(raw, "other@example.com")).toBe(false);
  });

  it("is consumed once by the NextAuth MongoDB adapter", async () => {
    const raw = await createLoginToken("asha@example.com");
    const adapter = MongoDBAdapter(mongoose.connection.getClient() as unknown as MongoClient, { databaseName: "medireach_login_test" });
    const first = await adapter.useVerificationToken!({ identifier: "asha@example.com", token: hashLoginToken(raw) });
    expect(first?.identifier).toBe("asha@example.com");
    const second = await adapter.useVerificationToken!({ identifier: "asha@example.com", token: hashLoginToken(raw) });
    expect(second).toBeNull();
    expect(await loginTokenValid(raw, "asha@example.com")).toBe(false);
  });

  it("builds the callback that lands on /account", () => {
    const u = new URL(callbackUrlFor("a".repeat(64), "asha@example.com"));
    expect(u.pathname).toBe("/api/auth/callback/email");
    expect(new URL(u.searchParams.get("callbackUrl")!).pathname).toBe("/account");
  });

  it("allows 3 links per email per 15 minutes, for any email", async () => {
    for (const email of ["asha@example.com", "nobody@example.com"]) {
      const results = [];
      for (let i = 0; i < LOGIN_LINK_LIMIT.max + 1; i++) results.push((await hitLoginLinkLimit(email.toUpperCase())).allowed);
      expect(results).toEqual([true, true, true, false]);
    }
  });
});

describe("login codes (email OTP)", () => {
  const codes = () => mongoose.connection.collection(LOGIN_CODE_COLLECTION);
  const wrong = (code: string) => String((Number(code) + 1) % 1_000_000).padStart(6, "0");

  it("emails the code, escapes the name and has a plain-text fallback", () => {
    const m = loginCodeEmail({ name: "Dr. <b>Asha</b>", code: "042917" });
    expect(m.subject).toBe("042917 is your MediReach login code");
    expect(m.html).toContain("042917");
    expect(m.html).toContain("Dr. &lt;b&gt;Asha&lt;/b&gt;");
    expect(m.html).toContain("expires in 10 minutes");
    expect(m.text).toContain("Your MediReach login code is 042917");
  });

  it("sends nothing and stores nothing for unknown emails", async () => {
    expect(await sendLoginCode("someone@example.com")).toBe(false);
    expect(await codes().countDocuments({ email: "someone@example.com" })).toBe(0);
    expect(await checkLoginCode("someone@example.com", "123456")).toBe(false);
  });

  it("stores only a keyed hash of a 6-digit code, for 10 minutes", async () => {
    const code = await createLoginCode("Asha@Example.com");
    expect(code).toMatch(/^\d{6}$/);
    const doc = await codes().findOne({ email: "asha@example.com" });
    expect(doc?.codeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(doc)).not.toContain(code);
    const ttl = (doc!.expires as Date).getTime() - Date.now();
    expect(ttl).toBeGreaterThan(9.9 * 60_000);
    expect(ttl).toBeLessThanOrEqual(10 * 60_000);
  });

  it("accepts the right code once, for the right email only", async () => {
    const code = await createLoginCode("asha@example.com");
    expect(await checkLoginCode("other@example.com", code)).toBe(false);
    expect(await checkLoginCode("asha@example.com", "12345")).toBe(false);
    expect(await checkLoginCode(" ASHA@example.com", code)).toBe(true);
    expect(await checkLoginCode("asha@example.com", code)).toBe(false);
  });

  it(`burns the code after ${LOGIN_CODE_MAX_ATTEMPTS} wrong tries`, async () => {
    const code = await createLoginCode("asha@example.com");
    for (let i = 0; i < LOGIN_CODE_MAX_ATTEMPTS; i++) expect(await checkLoginCode("asha@example.com", wrong(code))).toBe(false);
    expect(await checkLoginCode("asha@example.com", code)).toBe(false);
  });

  it("rejects an expired code, and a new code replaces the old one", async () => {
    const old = await createLoginCode("asha@example.com");
    const fresh = await createLoginCode("asha@example.com");
    if (old !== fresh) expect(await checkLoginCode("asha@example.com", old)).toBe(false);
    expect(await codes().countDocuments({ email: "asha@example.com" })).toBe(1);

    const code = await createLoginCode("asha@example.com");
    await codes().updateOne({ email: "asha@example.com" }, { $set: { expires: new Date(Date.now() - 1000) } });
    expect(await checkLoginCode("asha@example.com", code)).toBe(false);
  });

  it("exchanges a correct code for a NextAuth token the adapter accepts once", async () => {
    expect(await sessionUrlAfterCode("someone@example.com")).toBeNull();
    const u = new URL((await sessionUrlAfterCode("asha@example.com"))!);
    expect(u.pathname).toBe("/api/auth/callback/email");
    expect(new URL(u.searchParams.get("callbackUrl")!).pathname).toBe("/account");
    const raw = u.searchParams.get("token")!;
    expect(raw).toMatch(/^[a-f0-9]{64}$/);
    const adapter = MongoDBAdapter(mongoose.connection.getClient() as unknown as MongoClient, { databaseName: "medireach_login_test" });
    expect((await adapter.useVerificationToken!({ identifier: "asha@example.com", token: hashLoginToken(raw) }))?.identifier).toBe("asha@example.com");
    expect(await adapter.useVerificationToken!({ identifier: "asha@example.com", token: hashLoginToken(raw) })).toBeNull();
  });
});

describe("account (self-edit) schema", () => {
  const clinic = {
    key: "6650c0ffee0000000000000a",
    addressLine1: "12, Lane 3",
    addressLine2: "",
    pincode: "411038",
    mapsUrl: "",
    phone: "020 2545 1234",
    timings: [{ day: 1, slots: [{ open: "10:00", close: "13:00" }] }],
    appointmentNote: "Walk-ins welcome",
    fee: 500,
    showFee: true,
  };

  it("keeps only the fields a doctor may edit", () => {
    const parsed = accountSchema.parse({
      mobile: "+91 98765 43210",
      whatsapp: "",
      clinics: [{ ...clinic, name: "Renamed", cityId: "6650c0ffee0000000000000b", areaId: "6650c0ffee0000000000000c" }],
      firstName: "Hacker",
      status: "published",
    });
    expect(parsed).not.toHaveProperty("firstName");
    expect(parsed).not.toHaveProperty("status");
    expect(parsed.clinics[0]).not.toHaveProperty("name");
    expect(parsed.clinics[0]).not.toHaveProperty("cityId");
    expect(parsed.mobile).toBe("9876543210");
    expect(parsed.whatsapp).toBeUndefined();
  });

  it("rejects bad values with field paths", () => {
    const r = accountSchema.safeParse({ mobile: "123", whatsapp: "", clinics: [{ ...clinic, pincode: "41103", timings: [{ day: 1, slots: [{ open: "10:00", close: "10:00" }] }] }] });
    expect(r.success).toBe(false);
    const paths = r.success ? [] : r.error.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["mobile", "clinics.0.pincode", "clinics.0.timings.0.slots.0"]));
  });

  it("accepts the Beyond medicine photo and story, and scans their text", () => {
    const photo = { publicId: "p", url: "https://res.cloudinary.com/x/image/upload/p.jpg", caption: "100% fit at 40" };
    const input = accountSchema.parse({
      mobile: "",
      whatsapp: "",
      clinics: [clinic],
      interestsStory: { title: "My first marathon", body: "Training for 100% of the year.\n\nThen race day." },
      interestsPhoto: photo,
    });
    expect(input.interestsStory?.title).toBe("My first marathon");
    const issues = scanFields(accountTextFields(input)).map((i) => i.field);
    expect(issues).toEqual(expect.arrayContaining(["interestsStory.body", "interestsPhoto.caption"]));
    // A story needs a title once it has text.
    const untitled = accountSchema.safeParse({ mobile: "", whatsapp: "", clinics: [clinic], interestsStory: { title: "", body: "Some text" } });
    expect(untitled.success ? [] : untitled.error.issues.map((i) => i.path.join("."))).toContain("interestsStory.title");
    // Leaving the fields out keeps what's saved; null removes the photo; outside images are refused.
    expect(accountSchema.parse({ mobile: "", whatsapp: "", clinics: [clinic] }).interestsStory).toBeUndefined();
    expect(accountSchema.parse({ mobile: "", whatsapp: "", clinics: [clinic], interestsPhoto: null }).interestsPhoto).toBeNull();
    const foreign = accountSchema.safeParse({ mobile: "", whatsapp: "", clinics: [clinic], interestsPhoto: { ...photo, url: "https://evil.example/p.jpg" } });
    expect(foreign.success).toBe(false);
  });

  it("scans the appointment note and address for NMC phrases", () => {
    const input = accountSchema.parse({ mobile: "", whatsapp: "", clinics: [{ ...clinic, appointmentNote: "Best clinic in Kothrud", addressLine2: "Near guaranteed cure centre" }] });
    const issues = scanFields(accountTextFields(input));
    expect(issues.map((i) => i.field)).toEqual(expect.arrayContaining(["clinics.0.appointmentNote", "clinics.0.addressLine2"]));
  });
});
