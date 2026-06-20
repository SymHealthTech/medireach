"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { apiPost } from "@/lib/client/api";
import { uploadSigned } from "@/lib/client/upload";
import { VERIFICATION_DOC_TYPES, type VerificationDocType } from "@/lib/constants";

/**
 * Onboarding step 5 (spec §5.3): upload ONE verification document — doctor's
 * choice of which. This is stored privately and reviewed by admin AFTER the
 * account is already active (§6.1) — it does not block activation.
 */
const DOC_LABELS: Record<VerificationDocType, string> = {
  registration: "Medical registration certificate",
  degree: "Degree certificate",
  clinic: "Clinic registration certificate",
};

export function DocumentStep({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState<VerificationDocType>("registration");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please choose a file to upload.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { publicId } = await uploadSigned(file, "verification");
      await apiPost("/api/onboarding/document", { publicId, type });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-ink">Verify your practice</h1>
        <p className="text-sm text-ink-muted">
          Upload one document to verify you&apos;re a registered practitioner. Your account stays
          active while we review it.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos" role="alert">
          {error}
        </p>
      )}

      <div>
        <Label htmlFor="doctype">Document type</Label>
        <select
          id="doctype"
          value={type}
          onChange={(e) => setType(e.target.value as VerificationDocType)}
          className="h-12 w-full rounded-xl border border-line bg-surface-raised px-3.5 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {VERIFICATION_DOC_TYPES.map((t) => (
            <option key={t} value={t}>
              {DOC_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="docfile">Document image</Label>
        <input
          id="docfile"
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:text-brand-fg"
          required
        />
        <p className="mt-1 text-xs text-ink-muted">A clear photo of the certificate is fine.</p>
      </div>

      <Button type="submit" variant="brand" size="lg" className="w-full" disabled={loading}>
        {loading ? "Uploading…" : "Upload & continue"}
      </Button>
    </form>
  );
}
