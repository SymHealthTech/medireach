"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UNPAID_FIELD } from "@/lib/constants";

type Result = { ok: true; data: unknown } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Publishing waits for the setup payment. When none is recorded the publish
 * action refuses with UNPAID_FIELD; this asks the super admin "publish
 * anyway?" (free, founding and demo sites) and retries with `allowUnpaid`.
 *
 *   const { publish, dialog } = useUnpaidPublish();
 *   const res = await publish((allowUnpaid) => publishDoctorAction({ id, allowUnpaid }), { paymentsHref });
 *   // null = cancelled
 */
export function useUnpaidPublish(): {
  publish: <R extends Result>(call: (allowUnpaid?: boolean) => Promise<R>, opts?: { paymentsHref?: string }) => Promise<R | null>;
  dialog: ReactNode;
} {
  const [state, setState] = useState<{ paymentsHref?: string } | null>(null);
  const answer = useRef<((yes: boolean) => void) | null>(null);

  const ask = (paymentsHref?: string) =>
    new Promise<boolean>((resolve) => {
      answer.current = resolve;
      setState({ paymentsHref });
    });
  const close = (yes: boolean) => {
    answer.current?.(yes);
    answer.current = null;
    setState(null);
  };

  async function publish<R extends Result>(call: (allowUnpaid?: boolean) => Promise<R>, opts?: { paymentsHref?: string }): Promise<R | null> {
    const res = await call();
    if (res.ok || !res.fieldErrors?.[UNPAID_FIELD]) return res;
    if (!(await ask(opts?.paymentsHref))) return null;
    return call(true);
  }

  const dialog = (
    <AlertDialog open={state !== null} onOpenChange={(o) => !o && close(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>No payment recorded yet</AlertDialogTitle>
          <AlertDialogDescription>
            Websites go live once the setup payment is received. Record it in Payments first, or publish anyway (for example a free, founding or demo site).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          {state?.paymentsHref && (
            <Button asChild variant="outline">
              <Link href={state.paymentsHref} target="_blank" rel="noopener" onClick={() => close(false)}>
                <CreditCard /> Record payment
              </Link>
            </Button>
          )}
          <Button onClick={() => close(true)}>Publish anyway</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { publish, dialog };
}
