"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { apiPost, apiPatch } from "@/lib/client/api";

/**
 * Two-step mobile-number change (profile §12). Because email is the immutable,
 * verified identity, changing the mobile is guarded by an OTP sent to that
 * email: step 1 collects the new number and triggers the email; step 2 collects
 * the code and commits. On success it reports the new number to the parent.
 */
export function ChangeMobileModal({
  open,
  currentMobile,
  onClose,
  onUpdated,
}: {
  open: boolean;
  currentMobile: string;
  onClose: () => void;
  onUpdated: (mobile: string) => void;
}) {
  const [step, setStep] = useState<"enter" | "verify">("enter");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setStep("enter");
    setMobile("");
    setCode("");
    setMaskedEmail("");
    setError(null);
    setBusy(false);
  }

  function close() {
    reset();
    onClose();
  }

  // Full number sent to the server, with the country code the input shows.
  const fullMobile = `+91${mobile}`;

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await apiPost<{ email: string }>("/api/profile/mobile", { mobile: fullMobile });
      setMaskedEmail(res.email);
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the code.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await apiPatch<{ mobile: string }>("/api/profile/mobile", {
        mobile: fullMobile,
        code,
      });
      onUpdated(res.mobile);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update your number.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={close} labelledBy="change-mobile-title" className="max-w-md">
      <div className="p-6">
        <h2 id="change-mobile-title" className="text-lg font-semibold tracking-tight text-ink">
          Change mobile number
        </h2>
        <p className="mt-1 text-sm text-ink-muted">Current: {currentMobile || "—"}</p>

        {error && (
          <p className="mt-4 rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos" role="alert">
            {error}
          </p>
        )}

        {step === "enter" ? (
          <form onSubmit={sendCode} className="mt-4 space-y-4">
            <div>
              <Label htmlFor="new-mobile">New mobile number</Label>
              <div className="flex items-center gap-2">
                <span className="flex h-10 shrink-0 items-center rounded-lg border border-input bg-surface px-3 text-base text-ink-muted">
                  +91
                </span>
                <Input
                  id="new-mobile"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  placeholder="10-digit number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                />
              </div>
              <p className="mt-1.5 text-xs text-ink-muted">
                We&apos;ll email a 6-digit code to your registered address to confirm this change.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" variant="brand" disabled={busy || mobile.length !== 10}>
                {busy ? "Sending…" : "Send code"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={confirm} className="mt-4 space-y-4">
            <p className="text-sm text-ink-muted">
              Enter the code sent to <span className="font-medium text-ink">{maskedEmail}</span> to
              set your number to <span className="font-medium text-ink">{fullMobile}</span>.
            </p>
            <div>
              <Label htmlFor="mobile-otp">Verification code</Label>
              <Input
                id="mobile-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setStep("enter");
                  setCode("");
                  setError(null);
                }}
              >
                Back
              </Button>
              <Button type="submit" variant="brand" disabled={busy || code.length !== 6}>
                {busy ? "Updating…" : "Verify & update"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
