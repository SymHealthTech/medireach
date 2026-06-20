"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogoWordmark } from "@/components/brand/Logo";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { apiPost } from "@/lib/client/api";

/**
 * Admin console login (spec §6.7) — separate from the clinic login, with
 * MANDATORY MFA on every login (email + password + TOTP, no trusted-device
 * exception).
 */
export default function ConsoleLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPost("/api/admin-auth/login", { email, password, totp });
      router.push("/console");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-8 px-6">
      <LogoWordmark className="mx-auto" />
      <Card className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-ink">Admin console</h1>
          <p className="text-sm text-ink-muted">Authenticator code required.</p>
        </div>
        {error && <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos">{error}</p>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="totp">6-digit authenticator code</Label>
            <Input id="totp" inputMode="numeric" maxLength={6} value={totp} onChange={(e) => setTotp(e.target.value)} required />
          </div>
          <Button type="submit" variant="brand" size="lg" className="w-full" disabled={loading}>
            {loading ? "Verifying…" : "Log in"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
