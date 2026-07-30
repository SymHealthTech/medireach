"use client";

/**
 * Local (on-device) draft persistence for the consult form (Stage 0 offline
 * handling). Every edit is mirrored to localStorage keyed by visitId, so an
 * accidental refresh, a tab crash, or the internet dropping mid-consultation
 * never loses the doctor's in-progress work — it's restored on the next mount
 * and cleared once the visit is successfully saved to the server.
 *
 * This is device-local only. It does NOT sync to the server on its own — that
 * is Stage 1 (the outbox/queue). Here we only guarantee "nothing typed is lost".
 */

const PREFIX = "medireach:consult-draft:";
const VERSION = 1;

export interface ConsultDraft<F = unknown, P = unknown> {
  version: number;
  savedAt: number;
  form: F;
  patientEdits: P;
}

function keyFor(visitId: string): string {
  return `${PREFIX}${visitId}`;
}

/** Persist the current form + patient edits for this visit. Best-effort. */
export function saveConsultDraft<F, P>(visitId: string, form: F, patientEdits: P): void {
  if (typeof window === "undefined" || !visitId) return;
  try {
    const draft: ConsultDraft<F, P> = { version: VERSION, savedAt: Date.now(), form, patientEdits };
    window.localStorage.setItem(keyFor(visitId), JSON.stringify(draft));
  } catch {
    /* quota / private-mode — losing the draft mirror is non-fatal */
  }
}

/** Load a previously saved draft for this visit, or null if none / unreadable. */
export function loadConsultDraft<F, P>(visitId: string): ConsultDraft<F, P> | null {
  if (typeof window === "undefined" || !visitId) return null;
  try {
    const raw = window.localStorage.getItem(keyFor(visitId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as ConsultDraft<F, P>;
    if (!draft || draft.version !== VERSION) return null;
    return draft;
  } catch {
    return null;
  }
}

/** Drop the draft once the visit is safely saved to the server. */
export function clearConsultDraft(visitId: string): void {
  if (typeof window === "undefined" || !visitId) return;
  try {
    window.localStorage.removeItem(keyFor(visitId));
  } catch {
    /* ignore */
  }
}
