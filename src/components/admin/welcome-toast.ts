"use client";

import { toast } from "sonner";

/** After a publish: say whether the automatic welcome email (first publish only) went out. */
export function welcomeToast(data: unknown) {
  const welcome = (data as { welcome?: { sent?: string; note?: string } } | undefined)?.welcome;
  if (welcome?.sent) toast.success(`Welcome email sent to ${welcome.sent}`);
  else if (welcome?.note) toast.warning(welcome.note, { duration: 10000 });
}
