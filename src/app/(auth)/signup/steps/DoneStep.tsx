"use client";

import { Button } from "@/components/ui/Button";

/**
 * Onboarding step 7 (spec §5.3): account is active. Surfaces the permanent app
 * ID (shown in-app per §12) so the doctor has it from the very first screen.
 */
export function DoneStep({ appId, onContinue }: { appId: string | null; onContinue: () => void }) {
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
        <svg viewBox="0 0 24 24" className="h-7 w-7 stroke-success" fill="none" strokeWidth="2.5">
          <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-ink">You&apos;re all set!</h1>
        <p className="text-sm text-ink-muted">Your MediReach account is active.</p>
      </div>
      {appId && (
        <div className="rounded-xl bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Your MediReach ID</p>
          <p className="text-2xl font-bold text-brand">{appId}</p>
          <p className="mt-1 text-xs text-ink-muted">Keep this handy for any support queries.</p>
        </div>
      )}
      <Button variant="brand" size="lg" className="w-full" onClick={onContinue}>
        Go to my dashboard
      </Button>
    </div>
  );
}
