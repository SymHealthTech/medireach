import "server-only";
import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/doctor-auth";
import { doctorGreetingName, normalizeEmail } from "@/lib/auth/login-link";
import type { AuditActor } from "@/lib/api/audit";
import { connectToDatabase } from "@/lib/db";
import { DoctorProfile } from "@/models/DoctorProfile";

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

export async function requireDoctorPage(): Promise<CurrentDoctor> {
  const me = await getCurrentDoctor();
  if (!me) redirect("/login");
  return me;
}

export async function requireDoctor(): Promise<CurrentDoctor> {
  const me = await getCurrentDoctor();
  if (!me) throw new DoctorAuthError();
  return me;
}

export function doctorActor(me: CurrentDoctor): AuditActor {
  return { userId: me.id, role: "doctor", name: me.name };
}
