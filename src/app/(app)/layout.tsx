import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { Doctor } from "@/models/Doctor";
import { isReceptionistSessionValid } from "@/lib/auth/users";
import { AppShell } from "@/components/app/AppShell";

/**
 * App-shell guard + chrome (spec §5.3). Middleware blocks unauthenticated
 * users; here we also bounce a doctor who hasn't finished onboarding back into
 * the wizard, then wrap everything in the role-aware nav shell. Authoritative
 * per-action checks still live server-side in each API route.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "doctor") {
    await connectToDatabase();
    const doctor = await Doctor.findById(session.sub).select("onboardingStep").lean();
    if (!doctor || doctor.onboardingStep < 7) redirect("/signup");
  }

  // A receptionist whose account was deleted / password-changed by the doctor is
  // bounced to login on the next navigation (Change 1).
  if (session.role === "receptionist") {
    await connectToDatabase();
    if (!(await isReceptionistSessionValid(session.sub, session.tv))) redirect("/login");
  }

  return <AppShell role={session.role}>{children}</AppShell>;
}
