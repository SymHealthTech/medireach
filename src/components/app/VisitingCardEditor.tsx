"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { uploadSigned } from "@/lib/client/upload";
import { apiPost, apiPatch } from "@/lib/client/api";

/** Prefilled, live profile fields the card reuses — never re-entered by the doctor. */
export interface CardProfile {
  name: string;
  degree: string;
  clinicName: string;
  clinicAddress: string;
  clinicTimings: string;
  registrationNumber: string;
  mobile: string;
  photoPublicId: string | null;
}

/** Existing card (edit mode) as returned by GET /api/visiting-card. */
export interface CardData {
  slug: string;
  publicUrl: string;
  profilePhotoPublicId: string | null;
  coverPhotoPublicId: string | null;
  profilePhotoPreview: string | null;
  coverPhotoPreview: string | null;
  designation: string;
  tagline: string;
  services: string[];
  languages: string[];
  whatsappNumber: string;
  mapsLink: string;
}

/** Comma/Enter-driven chip input for a short list of tags (services, languages). */
function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const parts = raw
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const next = [...value];
    for (const p of parts) {
      if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p);
    }
    onChange(next);
    setDraft("");
  }

  return (
    <div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit(draft);
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" onClick={() => commit(draft)}>
          Add
        </Button>
      </div>
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== tag))}
                className="text-brand/60 hover:text-brand"
                aria-label={`Remove ${tag}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoPicker({
  label,
  hint,
  previewUrl,
  onPick,
  onClear,
  round,
  uploading,
}: {
  label: string;
  hint?: string;
  previewUrl: string | null;
  onPick: (file: File) => void;
  onClear?: () => void;
  round?: boolean;
  uploading: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        <div
          className={`flex items-center justify-center overflow-hidden bg-line/40 ${
            round ? "h-20 w-20 rounded-full" : "h-20 w-32 rounded-xl"
          }`}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-ink-muted">No image</span>
          )}
        </div>
        <div className="space-y-1.5">
          <input
            ref={ref}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPick(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => ref.current?.click()}
          >
            {uploading ? "Uploading…" : previewUrl ? "Change" : "Upload"}
          </Button>
          {previewUrl && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="block text-xs text-ink-muted hover:text-sos"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export function VisitingCardEditor({
  profile,
  card,
  onSaved,
  onCancel,
}: {
  profile: CardProfile;
  card: CardData | null;
  onSaved: (result: { slug: string; publicUrl: string }) => void;
  onCancel?: () => void;
}) {
  const isEdit = card !== null;

  // Profile photo: reuse the card's, else the profile photo already on file.
  const [profilePhotoId, setProfilePhotoId] = useState(
    card?.profilePhotoPublicId || profile.photoPublicId || "",
  );
  const [profilePreview, setProfilePreview] = useState<string | null>(
    card?.profilePhotoPreview ?? null,
  );
  const [coverPhotoId, setCoverPhotoId] = useState(card?.coverPhotoPublicId || "");
  const [coverPreview, setCoverPreview] = useState<string | null>(card?.coverPhotoPreview ?? null);

  const [designation, setDesignation] = useState(card?.designation ?? "");
  const [tagline, setTagline] = useState(card?.tagline ?? "");
  const [services, setServices] = useState<string[]>(card?.services ?? []);
  const [languages, setLanguages] = useState<string[]>(card?.languages ?? []);
  const [whatsappNumber, setWhatsappNumber] = useState(card?.whatsappNumber || profile.mobile || "");
  const [mapsLink, setMapsLink] = useState(card?.mapsLink ?? "");

  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickProfile(file: File) {
    setError(null);
    setUploadingProfile(true);
    try {
      const { publicId } = await uploadSigned(file, "profile-photo");
      setProfilePhotoId(publicId);
      setProfilePreview(URL.createObjectURL(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploadingProfile(false);
    }
  }

  async function pickCover(file: File) {
    setError(null);
    setUploadingCover(true);
    try {
      const { publicId } = await uploadSigned(file, "card-cover");
      setCoverPhotoId(publicId);
      setCoverPreview(URL.createObjectURL(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploadingCover(false);
    }
  }

  async function save() {
    setError(null);
    if (!profilePhotoId) {
      setError("Please add a profile photo — it appears on your card.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        profilePhotoPublicId: profilePhotoId,
        coverPhotoPublicId: coverPhotoId || undefined,
        designation: designation.trim(),
        tagline: tagline.trim(),
        services,
        languages,
        whatsappNumber: whatsappNumber.trim(),
        mapsLink: mapsLink.trim(),
      };
      const result = isEdit
        ? await apiPatch<{ slug: string; publicUrl: string }>("/api/visiting-card", body)
        : await apiPost<{ slug: string; publicUrl: string }>("/api/visiting-card", body);
      onSaved(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-ink">
          {isEdit ? "Edit visiting card" : "Create your visiting card"}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Your name, degree, clinic details, timings and registration number come from your profile
          automatically.
        </p>
      </div>

      {/* Prefilled, read-only summary so the doctor sees what's reused. */}
      <div className="rounded-xl bg-brand/5 p-3 text-sm">
        <p className="font-medium text-ink">Dr. {profile.name}</p>
        <p className="text-ink-muted">
          {[profile.degree, profile.clinicName].filter(Boolean).join(" · ") || "—"}
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-sos/10 px-3 py-2 text-sm text-sos" role="alert">
          {error}
        </p>
      )}

      <PhotoPicker
        label="Profile photo"
        hint="Required — shown as a circular photo on your card."
        previewUrl={profilePreview}
        onPick={pickProfile}
        round
        uploading={uploadingProfile}
      />

      <PhotoPicker
        label="Cover / banner photo (optional)"
        hint="A clinic photo or banner. If skipped, a branded MediReach gradient is used."
        previewUrl={coverPreview}
        onPick={pickCover}
        onClear={() => {
          setCoverPhotoId("");
          setCoverPreview(null);
        }}
        uploading={uploadingCover}
      />

      <div>
        <Label htmlFor="designation">Designation (optional)</Label>
        <Input
          id="designation"
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          placeholder="e.g. Consultant Physician"
          maxLength={120}
        />
        <p className="mt-1 text-xs text-ink-muted">Shown under your registration number.</p>
      </div>

      <div>
        <Label htmlFor="tagline">Short intro / tagline (optional)</Label>
        <Input
          id="tagline"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Family physician serving Kothrud since 2008"
          maxLength={160}
        />
      </div>

      <div>
        <Label>Services offered (optional)</Label>
        <TagInput value={services} onChange={setServices} placeholder="e.g. Diabetes Care" />
      </div>

      <div>
        <Label>Languages spoken (optional)</Label>
        <TagInput value={languages} onChange={setLanguages} placeholder="e.g. Hindi" />
      </div>

      <div>
        <Label htmlFor="wa">WhatsApp number</Label>
        <Input
          id="wa"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
          placeholder={profile.mobile}
          inputMode="tel"
        />
        <p className="mt-1 text-xs text-ink-muted">Defaults to your profile mobile number.</p>
      </div>

      <div>
        <Label htmlFor="maps">Google Maps location link (optional)</Label>
        <Input
          id="maps"
          value={mapsLink}
          onChange={(e) => setMapsLink(e.target.value)}
          placeholder="https://maps.app.goo.gl/…"
        />
        <p className="mt-1 text-xs text-ink-muted">Adds a “Get Directions” button.</p>
      </div>

      <div className="flex gap-3 pt-1">
        <Button
          type="button"
          variant="brand"
          size="lg"
          onClick={save}
          disabled={saving || uploadingProfile || uploadingCover}
        >
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create card"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="lg" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
      </div>
    </Card>
  );
}
