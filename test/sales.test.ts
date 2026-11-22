import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectToDatabase } from "@/lib/db";
import { findSalesExecutive, isSameExecutive, salesBusiness, salesExecutiveNames, salesSummary } from "@/lib/sales/server";
import { Admin } from "@/models/Admin";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";
import { Payment } from "@/models/Payment";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB = "medireach_sales_test";
  await connectToDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("sales executives", () => {
  it("lists dashboard users and names typed on records, and shows each one's business", async () => {
    await Admin.create({ email: "priya@example.com", name: "Priya Shah", passwordHash: "x", role: "sales" });
    const d = await DoctorProfile.create({ firstName: "Asha", lastName: "Kale", salesExecutive: "Rahul More", salesExecutiveId: "MR-S-7", status: "published" });
    await DoctorProfile.create({ firstName: "Ravi", lastName: "Pawar", salesExecutive: "priya shah" });
    const c = await Establishment.create({ kind: "clinic", plan: "clinic", name: "Shree Clinic", salesExecutive: " Rahul  More " });
    await Establishment.create({ kind: "hospital", plan: "hospital", name: "Sai Hospital", salesExecutive: "Rahul More" });
    await Payment.create({ doctorId: d._id, amount: 2999, mode: "upi", date: new Date(), purpose: "setup" });
    await Payment.create({ establishmentId: c._id, amount: 5000, mode: "cash", date: new Date(), purpose: "setup" });

    // Typed names join the dropdown once saved; spelling and case variants are one person.
    expect(await salesExecutiveNames()).toEqual(["Priya Shah", "Rahul More"]);
    expect(await findSalesExecutive("rahul more")).toBe("Rahul More");
    expect(await findSalesExecutive("Nobody")).toBeNull();
    // A sales user's own page: their login name, any case or spacing.
    expect(isSameExecutive(" priya  SHAH", "Priya Shah")).toBe(true);
    expect(isSameExecutive("Rahul More", "Priya Shah")).toBe(false);

    const rows = await salesSummary();
    expect(rows[0]).toMatchObject({ name: "Rahul More", staffId: "MR-S-7", isUser: false, doctors: 1, clinics: 1, hospitals: 1, published: 1, collected: 7999 });
    expect(rows[1]).toMatchObject({ name: "Priya Shah", isUser: true, doctors: 1, clinics: 0, collected: 0 });

    const items = await salesBusiness("Rahul More");
    expect(items.map((i) => i.kind).sort()).toEqual(["clinic", "doctor", "hospital"]);
    expect(items.find((i) => i.kind === "doctor")).toMatchObject({ name: "Dr. Asha Kale", collected: 2999, href: `/admin/doctors/${d._id}` });
  });
});
