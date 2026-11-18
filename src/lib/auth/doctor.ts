import "server-only";
import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/doctor-auth";
import { doctorGreetingName, normalizeEmail } from "@/lib/auth/login-link";
import type { AuditActor } from "@/lib/api/audit";
import { connectToDatabase } from "@/lib/db";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";

/**
 * The signed-in doctor. The session only carries the email; the doctor is
 * re-read from the database on every request, so turning off self-edit (or
 * changing the login email) in the dashboard ends access straight away.
 */

export class DoctorAuthError extends Error {
  constructor(message = "Your session has ended. Please log in again.") {
    super(message);
    this.name = "DoctorAuthError";
  }
}

export const getCurrentDoctor = cache(async () => {
  const session = await getServerSession(authOptions());
  const email = session?.user?.email;
  if (!email) return null;
  await connectToDatabase();
  const doctor = await DoctorProfile.findOne({ ownerEmail: normalizeEmail(email) });
  if (!doctor) return null;
  return { id: String(doctor._id), email: normalizeEmail(email), name: doctorGreetingName(doctor), doctor };
});

export type CurrentDoctor = NonNullable<Awaited<ReturnType<typeof getCurrentDoctor>>>;

/** Doctor-only pages: a signed-in site owner without a doctor profile goes back to /account. */
export async function requireDoctorPage(): Promise<CurrentDoctor> {
  const me = await getCurrentDoctor();
  if (me) return me;
  redirect((await getCurrentAccount()) ? "/account" : "/login");
}

export async function requireDoctor(): Promise<CurrentDoctor> {
  const me = await getCurrentDoctor();
  if (!me) throw new DoctorAuthError();
  return me;
}

export function doctorActor(me: CurrentDoctor): AuditActor {
  return { userId: me.id, role: "doctor", name: me.name };
}

// ---------------------------------------------------------------------------
// Account = everything one login email owns: a doctor profile and/or any
// number of clinic/hospital sites (one owner may have several).
// ---------------------------------------------------------------------------

export const getCurrentAccount = cache(async () => {
  const session = await getServerSession(authOptions());
  const raw = session?.user?.email;
  if (!raw) return null;
  const email = normalizeEmail(raw);
  await connectToDatabase();
  const [doctor, sites] = await Promise.all([DoctorProfile.findOne({ ownerEmail: email }), Establishment.find({ ownerEmail: email }).sort({ name: 1 })]);
  if (!doctor && sites.length === 0) return null;
  return { email, name: doctor ? doctorGreetingName(doctor) : sites[0]!.name, doctor, sites };
});

export type CurrentAccount = NonNullable<Awaited<ReturnType<typeof getCurrentAccount>>>;

export async function requireAccountPage(): Promise<CurrentAccount> {
  const me = await getCurrentAccount();
  if (!me) redirect("/login");
  return me;
}

export async function requireAccount(): Promise<CurrentAccount> {
  const me = await getCurrentAccount();
  if (!me) throw new DoctorAuthError();
  return me;
}

/** Audit actor for a site owner editing one of their sites. */
export function ownerActor(me: CurrentAccount, siteId: string): AuditActor {
  return { userId: me.doctor ? String(me.doctor._id) : siteId, role: me.doctor ? "doctor" : "owner", name: me.name };
}
