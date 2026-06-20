"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { apiGet, apiPost } from "@/lib/client/api";
import { uploadSigned } from "@/lib/client/upload";

/**
 * Onboarding step 4 (spec §5.3): clinic + doctor profile. Profile photo is
 * optional (uploaded as a signed, authenticated Cloudinary asset).
 */
export function ProfileStep({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    name: "",
    registrationNumber: "",
    degree: "",
    clinicName: "",
    clinicAddress: "",
    clinicTimings: "",
  });
  const [photoPublicId, setPhotoPublicId] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiGet<{ name: string }>("/api/onboarding/status")
      .then((s) => setForm((f) => ({ ...f, name: s.name ?? "" })))
      .catch(() => {});
  }, []);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { publicId } = await uploadSigned(file, "profile-photo");
      setPhotoPublicId(publicId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPost("/api/onboarding/profile", { ...form, photoPublicId });
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
        <h1 className="text-xl font-bold text-ink">Your clinic profile</h1>
        <p className="text-sm text-ink-muted">This appears on your prescriptions.</p>
      </div>

      {error && (
        <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos" role="alert">
          {error}
        </p>
      )}

      <div>
        <Label htmlFor="dname">Doctor name</Label>
        <Input id="dname" value={form.name} onChange={(e) => set("name", e.target.value)} required />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="reg">Registration number</Label>
          <Input
            id="reg"
            value={form.registrationNumber}
            onChange={(e) => set("registrationNumber", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="degree">Degree / qualification</Label>
          <Input id="degree" value={form.degree} onChange={(e) => set("degree", e.target.value)} required />
        </div>
      </div>
      <div>
        <Label htmlFor="cname">Clinic name</Label>
        <Input id="cname" value={form.clinicName} onChange={(e) => set("clinicName", e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="caddr">Clinic address</Label>
        <Input
          id="caddr"
          value={form.clinicAddress}
          onChange={(e) => set("clinicAddress", e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="ctime">Clinic timings <span className="text-ink-muted font-normal">(optional)</span></Label>
        <Input
          id="ctime"
          placeholder="e.g. Mon–Sat, 10am–2pm & 5pm–9pm"
          value={form.clinicTimings}
          onChange={(e) => set("clinicTimings", e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="photo">Profile photo (optional)</Label>
        <input
          id="photo"
          type="file"
          accept="image/*"
          onChange={onPhoto}
          className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:text-brand-fg"
        />
        {uploading && <p className="mt-1 text-xs text-ink-muted">Uploading…</p>}
        {photoPublicId && !uploading && <p className="mt-1 text-xs text-success">Photo uploaded.</p>}
      </div>

      <Button type="submit" variant="brand" size="lg" className="w-full" disabled={loading || uploading}>
        {loading ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
