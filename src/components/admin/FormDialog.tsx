"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { startNavigationProgress } from "@/components/loading/NavigationProgress";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Result<T> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Dialog with a form that submits to a server action, shows field errors,
 * toasts the outcome and refreshes the server-rendered list.
 */
export function FormDialog<T>({
  trigger,
  title,
  description,
  submitLabel = "Save",
  onSubmit,
  successMessage,
  onSuccess,
  children,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  submitLabel?: string;
  onSubmit: () => Promise<Result<T>>;
  successMessage: string;
  onSuccess?: (data: T) => void;
  children: (errors: Record<string, string>) => ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setErrors({});
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await onSubmit();
              if (!res.ok) {
                setErrors(res.fieldErrors ?? {});
                toast.error(res.error);
                return;
              }
              toast.success(successMessage);
              setErrors({});
              setOpen(false);
              onSuccess?.(res.data);
              router.refresh();
            });
          }}
        >
          {children(errors)}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Button that asks for confirmation, then runs a server action. */
export function ConfirmButton({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  successMessage,
  redirectTo,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => Promise<{ ok: boolean; error?: string }>;
  successMessage: string;
  /** Navigate here on success (e.g. after deleting the record being viewed). */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await onConfirm();
                if (!res.ok) return void toast.error(res.error ?? "Something went wrong.");
                toast.success(successMessage);
                if (redirectTo) {
                  startNavigationProgress();
                  router.push(redirectTo);
                }
                else router.refresh();
              })
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Run a server action from a click with toast + refresh. */
export function useActionRunner() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error ?? "Something went wrong.");
      if (success) toast.success(success);
      router.refresh();
    });
  return { run, pending };
}
