"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogoWordmark } from "@/components/brand/Logo";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { apiPost } from "@/lib/client/api";

/**
 * Account recovery (spec §5.3, §15.1): request a reset OTP to the registered
 * mobile, then set a new password. Without this there's no way back into a
 * locked-down account.
 */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function request(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPost("/api/auth/forgot-password", { identifier });
      setStep("reset");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPost("/api/auth/reset-password", { identifier, code, password });
      router.push("/login");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6">
      <Link href="/" className="mx-auto">
        <LogoWordmark />
      </Link>
      <Card className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-ink">Reset password</h1>
          <p className="text-sm text-ink-muted">
            {step === "request"
              ? "We'll email a reset code to your registered email address."
              : "Enter the code and your new password."}
          </p>
        </div>

        {error && (
          <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos" role="alert">
            {error}
          </p>
        )}

        {step === "request" ? (
          <form onSubmit={request} className="space-y-4">
            <div>
              <Label htmlFor="identifier">Mobile number or email</Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
            <Button type="submit" variant="brand" size="lg" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Send reset code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={reset} className="space-y-4">
            <div>
              <Label htmlFor="code">6-digit code</Label>
              <Input id="code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="np">New password</Label>
              <Input id="np" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" variant="brand" size="lg" className="w-full" disabled={loading}>
              {loading ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}

        <Link href="/login" className="block text-center text-sm text-brand hover:underline">
          Back to login
        </Link>
      </Card>
    </main>
  );
}
