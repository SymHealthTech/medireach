"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogoWordmark } from "@/components/brand/Logo";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/client/api";
import { AccountStep } from "./steps/AccountStep";
import { ProfileStep } from "./steps/ProfileStep";
import { DocumentStep } from "./steps/DocumentStep";
import { PaymentStep } from "./steps/PaymentStep";
import { DoneStep } from "./steps/DoneStep";

/**
 * Doctor onboarding wizard (spec §5.3). The exact 7-step sequence, resumable
 * after an interruption: on mount we ask the server where the doctor left off
 * (/api/onboarding/status) and jump to the right step. The account is not
 * usable until all steps complete; activation happens immediately on the ₹99
 * payment with no manual approval gate.
 */
type Phase = "account" | "profile" | "document" | "payment" | "done";

const STEP_LABELS = ["Account", "Profile", "Verify", "Payment"];

function phaseFromStep(step: number): Phase {
  if (step >= 7) return "done";
  if (step >= 5) return "payment";
  if (step >= 4) return "document";
  if (step >= 3) return "profile";
  return "account";
}

export default function SignupPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("account");
  const [appId, setAppId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Resume if a session already exists from a partial signup.
    apiGet<{ onboardingStep: number; appId: string | null }>("/api/onboarding/status")
      .then((s) => {
        setAppId(s.appId);
        setPhase(phaseFromStep(s.onboardingStep));
      })
      .catch(() => setPhase("account"))
      .finally(() => setReady(true));
  }, []);

  const stepIndex =
    phase === "account" ? 0 : phase === "profile" ? 1 : phase === "document" ? 2 : 3;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-10">
      <Link href="/" className="mx-auto">
        <LogoWordmark />
      </Link>

      {phase !== "done" && (
        <ol className="flex items-center justify-center gap-2" aria-label="Onboarding progress">
          {STEP_LABELS.map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  i <= stepIndex ? "bg-brand text-brand-fg" : "bg-line text-ink-muted"
                }`}
              >
                {i + 1}
              </span>
              <span className="hidden text-sm text-ink-muted sm:inline">{label}</span>
              {i < STEP_LABELS.length - 1 && <span className="h-px w-4 bg-line" />}
            </li>
          ))}
        </ol>
      )}

      <Card className="space-y-5">
        {!ready ? (
          <p className="text-center text-ink-muted">Loading…</p>
        ) : phase === "account" ? (
          <AccountStep onDone={() => setPhase("profile")} />
        ) : phase === "profile" ? (
          <ProfileStep onDone={() => setPhase("document")} />
        ) : phase === "document" ? (
          <DocumentStep onDone={() => setPhase("payment")} />
        ) : phase === "payment" ? (
          <PaymentStep
            onDone={(id) => {
              setAppId(id);
              setPhase("done");
            }}
          />
        ) : (
          <DoneStep appId={appId} onContinue={() => router.push("/app")} />
        )}
      </Card>

      {phase === "account" && (
        <p className="text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-brand hover:underline">
            Log in
          </Link>
        </p>
      )}
    </main>
  );
}
