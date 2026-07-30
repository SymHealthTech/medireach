"use client";

import { clearConsultDraft } from "@/lib/client/consultDraft";

/**
 * Offline outbox (Stage 1 offline handling). When a "finalize this visit" save
 * can't reach the server because the device is offline, the payload is parked
 * here on-device and replayed automatically the moment connectivity returns —
 * so the doctor never has to remember to re-tap Save.
 *
 * Safe to replay because both endpoints are idempotent:
 *   - POST /api/visits/[id]/confirm short-circuits when the visit is already
 *     confirmed (returns { alreadyConfirmed: true }).
 *   - PATCH /api/patients/[id] is field-wise last-write-wins.
 *
 * Storage is localStorage (payloads are small JSON). The flush is driven by the
 * app (on reconnect / on load), not a Service Worker Background Sync — that
 * (surviving a fully-closed app) would be a later enhancement.
 */

const KEY = "medireach:outbox:v1";
const MAX_ATTEMPTS = 8;

export interface VisitFinalizeJob {
  id: string;
  kind: "visit-finalize";
  visitId: string;
  patientId: string | null;
  visitPayload: unknown;
  patientPayload: unknown | null;
  createdAt: number;
  attempts: number;
}

type OutboxJob = VisitFinalizeJob;

function read(): OutboxJob[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OutboxJob[]) : [];
  } catch {
    return [];
  }
}

function write(jobs: OutboxJob[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(jobs));
  } catch {
    /* quota / private-mode — nothing safe to do here */
  }
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Number of saves currently waiting to sync. */
export function outboxCount(): number {
  return read().length;
}

/**
 * Queue a visit-finalize save. Deduped by visitId — a newer attempt for the
 * same visit replaces the older queued payload (the latest edit wins).
 */
export function enqueueVisitFinalize(
  input: Pick<VisitFinalizeJob, "visitId" | "patientId" | "visitPayload" | "patientPayload">,
): void {
  const jobs = read().filter((j) => j.visitId !== input.visitId);
  jobs.push({
    id: newId(),
    kind: "visit-finalize",
    createdAt: Date.now(),
    attempts: 0,
    ...input,
  });
  write(jobs);
  notify();
}

let flushing = false;
const listeners = new Set<() => void>();

/** Subscribe to outbox changes (count / flush activity) for UI indicators. */
export function subscribeOutbox(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(): void {
  listeners.forEach((fn) => fn());
}

async function replayJob(job: VisitFinalizeJob): Promise<void> {
  // Patient demographics first (best-effort — a visit with no patientId, e.g.
  // an already-registered edit, just skips this), then the confirm gate.
  if (job.patientId && job.patientPayload) {
    const res = await fetch(`/api/patients/${job.patientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job.patientPayload),
    });
    if (!res.ok) throw new HttpError(res.status);
  }
  const res = await fetch(`/api/visits/${job.visitId}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(job.visitPayload),
  });
  if (!res.ok) throw new HttpError(res.status);
}

class HttpError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
  }
}

export interface FlushResult {
  synced: number;
  remaining: number;
}

/**
 * Replay every queued job. Called on app load and whenever the browser fires
 * `online`. Concurrency-guarded so overlapping triggers don't double-send.
 *
 *  - Success  → drop the job and clear that visit's on-device draft.
 *  - Network failure (still offline) → stop; leave the queue for next time.
 *  - Server rejection → bump attempts; keep it (idempotent, so retrying is
 *    safe) until MAX_ATTEMPTS, then leave it parked rather than silently drop
 *    a clinical record.
 */
export async function flushOutbox(): Promise<FlushResult> {
  if (flushing) return { synced: 0, remaining: outboxCount() };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, remaining: outboxCount() };
  }
  flushing = true;
  notify();
  let synced = 0;
  try {
    // Snapshot ids up front; re-read the live queue each pass so we never
    // resurrect a job the user cleared elsewhere.
    for (const snapshot of read()) {
      const current = read().find((j) => j.id === snapshot.id);
      if (!current) continue;
      if (current.attempts >= MAX_ATTEMPTS) continue;
      try {
        await replayJob(current);
        // Success — remove this job and clear its device draft.
        write(read().filter((j) => j.id !== current.id));
        clearConsultDraft(current.visitId);
        synced++;
        notify();
      } catch (err) {
        if (err instanceof HttpError) {
          // Session expired — not the job's fault. Stop and retry after the
          // next login/reload, without spending a retry attempt.
          if (err.status === 401) break;
          // Server reachable but rejected — bump attempts and move on.
          write(read().map((j) => (j.id === current.id ? { ...j, attempts: j.attempts + 1 } : j)));
          notify();
          continue;
        }
        // Network failure — we've gone offline again. Stop here.
        break;
      }
    }
  } finally {
    flushing = false;
    notify();
  }
  return { synced, remaining: outboxCount() };
}
