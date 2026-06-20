import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Patient } from "@/models/Patient";
import { scopedFindById, scopedFind } from "@/lib/api/scoped";
import { tenantFilter, type AuthContext } from "@/lib/api/context";

/**
 * Phase 1 verification requirement (build-prompt): prove that one doctor cannot
 * fetch another doctor's data, and that the data layer — not the UI — enforces
 * it. We exercise the real scoped data-access helpers used by every API route.
 */

let mongo: MongoMemoryServer;
const doctorA = new mongoose.Types.ObjectId();
const doctorB = new mongoose.Types.ObjectId();
let patientAId: string;

const ctx = (doctorId: string | null, role: AuthContext["role"]): AuthContext => ({
  userId: doctorId ?? "admin",
  role,
  doctorId,
  name: "test",
});

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  const patient = await Patient.create({
    doctorId: doctorA,
    name: "Aarav",
    gender: "male",
    mobile: "9876543210",
    consentAt: new Date(),
  });
  patientAId = patient._id.toString();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("multi-tenant isolation (spec §13/§15.2)", () => {
  it("lets the owning doctor read their own patient", async () => {
    const found = await scopedFindById(Patient, ctx(doctorA.toString(), "doctor"), patientAId);
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Aarav");
  });

  it("rejects a different doctor reading another doctor's patient by id", async () => {
    const found = await scopedFindById(Patient, ctx(doctorB.toString(), "doctor"), patientAId);
    expect(found).toBeNull();
  });

  it("never returns cross-tenant rows from a list query", async () => {
    const rows = await scopedFind(Patient, ctx(doctorB.toString(), "doctor"));
    expect(rows).toHaveLength(0);
  });

  it("cannot be widened by a client-supplied doctorId in the filter", async () => {
    // Attacker (doctor B) tries to inject doctor A's id into the filter.
    const rows = await scopedFind(Patient, ctx(doctorB.toString(), "receptionist"), {
      doctorId: doctorA.toString(),
    } as never);
    // The trusted ctx scope overrides the injected value → no rows.
    expect(rows).toHaveLength(0);
  });

  it("forces admin to query cross-tenant explicitly (tenantFilter throws)", () => {
    expect(() => tenantFilter(ctx(null, "admin"))).toThrow();
  });
});
