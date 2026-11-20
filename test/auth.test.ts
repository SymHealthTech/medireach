import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { hitRateLimit } from "@/lib/api/rate-limit";
import { connectToDatabase } from "@/lib/db";
import { safeAdminNext } from "@/lib/auth/redirect";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";
import { seedSuperadmin } from "@/lib/seed/admin";
import { activeNavItem, MOBILE_TABS, navForRole, NAV_ITEMS, NEW_ITEMS, rolesFor } from "@/components/admin/nav";
import { Admin } from "@/models/Admin";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  process.env.AUTH_SESSION_SECRET = "test-secret-test-secret-test-secret-123";
  mongod = await MongoMemoryServer.create();
  // Connect through the app's own helper (hitRateLimit uses it too).
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB = "medireach_auth_test";
  await connectToDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("rate limiter", () => {
  it("allows 5 attempts per window, then blocks", async () => {
    const t = Date.UTC(2026, 10, 15, 10, 0, 0);
    const results = [];
    for (let i = 0; i < 6; i++) results.push(await hitRateLimit("login:ip:1.2.3.4", 5, 15 * 60_000, t + i));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, true, true, false]);
    expect(results[5]!.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("starts fresh in the next window and keeps keys separate", async () => {
    const t = Date.UTC(2026, 10, 15, 10, 20, 0);
    expect((await hitRateLimit("login:ip:1.2.3.4", 5, 15 * 60_000, t)).allowed).toBe(true);
    expect((await hitRateLimit("login:ip:5.6.7.8", 5, 15 * 60_000, t)).allowed).toBe(true);
  });
});

describe("post-login redirect", () => {
  it("only allows dashboard paths", () => {
    expect(safeAdminNext("/admin/doctors?q=amit")).toBe("/admin/doctors?q=amit");
    expect(safeAdminNext("/admin")).toBe("/admin");
    expect(safeAdminNext("https://evil.com")).toBe("/admin");
    expect(safeAdminNext("//evil.com/admin")).toBe("/admin");
    expect(safeAdminNext("/admin//evil.com")).toBe("/admin");
    expect(safeAdminNext("/administrator")).toBe("/admin");
    expect(safeAdminNext("/admin/login")).toBe("/admin");
    expect(safeAdminNext(undefined)).toBe("/admin");
  });
});

describe("seedSuperadmin", () => {
  it("creates once, then leaves the account alone unless asked", async () => {
    const input = { email: "Founder@Example.com", password: "a-long-test-password", name: "Satish" };
    expect(await seedSuperadmin(input)).toBe("created");
    expect(await seedSuperadmin({ ...input, password: "another-long-password" })).toBe("exists");
    const admin = await Admin.findOne({ email: "founder@example.com" }).lean();
    expect(admin?.role).toBe("superadmin");
    expect(await verifyPassword("a-long-test-password", admin!.passwordHash)).toBe(true);

    expect(await seedSuperadmin({ ...input, password: "another-long-password" }, { resetPassword: true })).toBe(
      "password_reset",
    );
    const updated = await Admin.findOne({ email: "founder@example.com" }).lean();
    expect(await verifyPassword("another-long-password", updated!.passwordHash)).toBe(true);
  });

  it("rejects weak input", async () => {
    await expect(seedSuperadmin({ email: "x@example.com", password: "short" })).rejects.toThrow(/12 characters/);
    await expect(seedSuperadmin({ email: "not-an-email", password: "a-long-test-password" })).rejects.toThrow(/valid email/);
  });
});

describe("sessions and roles", () => {
  it("round-trips a signed token and rejects tampering", async () => {
    const token = await createSessionToken({ sub: "507f1f77bcf86cd799439011", role: "sales", name: "Ravi" });
    expect(await verifySessionToken(token)).toEqual({ sub: "507f1f77bcf86cd799439011", role: "sales", name: "Ravi" });
    const [h, p, s] = token.split(".");
    const forged = `${h}.${Buffer.from(JSON.stringify({ sub: "x", role: "superadmin" })).toString("base64url")}.${s}`;
    expect(await verifySessionToken(forged)).toBeNull();
    expect(p).toBeTruthy();
  });

  it("hides admin-only sections from sales", () => {
    const sales = navForRole("sales").map((n) => n.label);
    expect(sales).toEqual(["Overview", "Doctors", "Clinics", "Hospitals", "Sites", "Visiting cards", "Website forms", "Leads"]);
    expect(navForRole("superadmin")).toHaveLength(NAV_ITEMS.length);
    expect(rolesFor("/admin/payments")).not.toContain("sales");
  });

  it("finds the active section", () => {
    expect(activeNavItem("/admin")?.label).toBe("Overview");
    expect(activeNavItem("/admin/doctors/new")?.label).toBe("Doctors");
    expect(activeNavItem("/admin/update-requests")?.label).toBe("Update requests");
    expect(activeNavItem("/admin/intakes/abc")?.label).toBe("Website forms");
    expect(activeNavItem("/admin/establishments/new")?.label).toBe("Clinics");
    expect(activeNavItem("/admin/establishments/new", NAV_ITEMS, "kind=hospital")?.label).toBe("Hospitals");
    expect(activeNavItem("/admin/establishments", NAV_ITEMS, "kind=clinic&status=draft")?.label).toBe("Clinics");
    expect(activeNavItem("/admin/payments/renewals")?.label).toBe("Payments & renewals");
  });

  it("follows the spec's menu order, mobile tabs and New choices", () => {
    expect(NAV_ITEMS.map((n) => n.label)).toEqual([
      "Overview",
      "Doctors",
      "Clinics",
      "Hospitals",
      "Sites",
      "Visiting cards",
      "Designs & themes",
      "Payments & renewals",
      "Update requests",
      "Website forms",
      "Leads",
      "Master lists",
      "SEO",
      "Settings",
    ]);
    expect(MOBILE_TABS.map((h) => NAV_ITEMS.find((n) => n.href === h)!.short ?? NAV_ITEMS.find((n) => n.href === h)!.label)).toEqual(["Overview", "Doctors", "Clinics"]);
    expect(NEW_ITEMS.map((n) => n.label)).toEqual(["Doctor", "Clinic", "Hospital"]);
  });
});
