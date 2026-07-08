"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogoWordmark } from "@/components/brand/Logo";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { ScreenLoader } from "@/components/ui/Spinner";

/**
 * Clinic login (doctor + receptionist), spec §15.1. Two-step: credentials, then
 * (only on a new device) an OTP. Admin logs in via a separate, unlinked route.
 */
export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Held true from a successful login through the client navigation into the
  // app shell, so the screen never looks frozen during the hand-off (Phase 1).
  const [redirecting, setRedirecting] = useState(false);

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        setLoading(false);
        return;
      }
      if (data.onboardingIncomplete) {
        setRedirecting(true);
        router.push("/signup");
        return;
      }
      if (data.otpRequired) {
        setStep("otp");
        setLoading(false);
        return;
      }
      setRedirecting(true);
      router.push(data.role === "receptionist" ? "/app/queue" : "/app");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Verification failed.");
        setLoading(false);
        return;
      }
      setRedirecting(true);
      router.push(data.role === "receptionist" ? "/app/queue" : "/app");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  // Full-screen loader covers the gap between a successful login and the app
  // shell painting — the worst "frozen" offender the build-prompt calls out.
  if (redirecting) return <ScreenLoader label="Signing you in…" />;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6">
      <Link href="/" className="mx-auto">
        <LogoWordmark />
      </Link>

      <Card className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-ink">Log in</h1>
          <p className="text-sm text-ink-muted">
            {step === "credentials"
              ? "Doctors: use your mobile or email. Receptionists: use your username."
              : "Enter the code we emailed you."}
          </p>
        </div>

        {error && (
          <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos" role="alert">
            {error}
          </p>
        )}

        {step === "credentials" ? (
          <form onSubmit={submitCredentials} className="space-y-4">
            <div>
              <Label htmlFor="identifier">Mobile / email / username</Label>
              <Input
                id="identifier"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" variant="brand" size="lg" className="w-full" loading={loading}>
              {loading ? "Checking…" : "Continue"}
            </Button>
          </form>
        ) : (
          <form onSubmit={submitOtp} className="space-y-4">
            <div>
              <Label htmlFor="code">6-digit code</Label>
              <Input
                id="code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <Button type="submit" variant="brand" size="lg" className="w-full" loading={loading}>
              {loading ? "Verifying…" : "Verify & log in"}
            </Button>
          </form>
        )}

        <div className="flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="text-brand hover:underline">
            Forgot password?
          </Link>
          <Link href="/signup" className="text-brand hover:underline">
            New here? Sign up
          </Link>
        </div>
      </Card>
    </main>
  );
}
