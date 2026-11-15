"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Error boundary for dashboard sections: friendly message + retry, details in the console. */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="flex flex-col items-center rounded-xl border border-clay/30 bg-card px-6 py-14 text-center">
      <AlertTriangle className="size-8 text-clay" strokeWidth={1.5} />
      <p className="mt-4 font-display text-lg font-semibold text-ink">Something went wrong loading this page.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Please try again. If it keeps happening, share this code: {error.digest ?? "—"}
      </p>
      <Button className="mt-5" onClick={reset}>
        <RotateCcw /> Try again
      </Button>
    </div>
  );
}
