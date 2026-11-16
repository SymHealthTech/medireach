import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DoctorLoginForm } from "@/components/account/DoctorLoginForm";
import { getCurrentDoctor } from "@/lib/auth/doctor";

export const metadata: Metadata = { title: { absolute: "Doctor login – MediReach" }, robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  Verification: "That login link has expired or was already used. Request a new one below.",
  AccessDenied: "We couldn't log you in with that link. Request a new one, or message us on WhatsApp.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentDoctor()) redirect("/account");
  const { error } = await searchParams;
  const message = error ? (ERRORS[error] ?? "Something went wrong. Please request a new login link.") : undefined;
  return (
    <main className="mx-auto max-w-md px-4 pb-24 pt-12 sm:pt-20">
      <DoctorLoginForm linkError={message} />
    </main>
  );
}
