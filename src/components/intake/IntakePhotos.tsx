"use client";

import { useRef, useState } from "react";
import { Crop, ImagePlus, Lightbulb, Loader2, Trash2, Upload } from "lucide-react";
import { WhatsAppIcon } from "@/components/marketing/WhatsAppLink";
import { uploadImage, type UploadSigner } from "@/lib/client/upload-image";
import { cn } from "@/lib/cn";
import { photosWhatsappText, type IntakePhoto, type IntakePhotos, type PhotoConfig, type SinglePhotoKey } from "@/lib/intake/form";
import { inputClass, SectionCard } from "./IntakeFields";
import { PhotoCropDialog } from "./PhotoCropDialog";

/** Shrink big phone photos before upload; falls back to the original (e.g. HEIC on Chrome). */
async function shrink(file: Blob, maxSide = 2400): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    if (scale === 1 && file.size < 4 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.88));
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Cloudinary thumbnail URL. */
const thumb = (url: string, w = 480) => url.replace("/image/upload/", `/image/upload/f_auto,q_auto,c_limit,w_${w}/`);

const formatPhone = (digits: string) => {
  const d = digits.replace(/\D/g, "");
  return d.length === 12 && d.startsWith("91") ? `+91 ${d.slice(2, 7)} ${d.slice(7)}` : `+${d}`;
};

/**
 * Photos: upload here, or send them on WhatsApp (with the form reference in
 * the message). Uploads need a saved form, so `ensureSaved` saves first.
 */
export function IntakePhotosSection({
  config,
  photos,
  onChange,
  ensureSaved,
  sign,
  waNumber,
  formRef,
  email,
  name,
  disabled,
  error,
}: {
  config: PhotoConfig;
  photos: IntakePhotos;
  onChange: (p: IntakePhotos) => void;
  ensureSaved: () => Promise<boolean>;
  sign: UploadSigner;
  waNumber: string;
  formRef?: string;
  email: string;
  name: string;
  disabled?: boolean;
  error?: string;
}) {
  const mode = photos.viaWhatsapp ? "whatsapp" : "upload";
  const [busy, setBusy] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Uploads finish asynchronously; always build on the newest photos.
  const latest = useRef(photos);
  latest.current = photos;
  const set = (p: IntakePhotos) => {
    latest.current = p;
    onChange(p);
  };

  // Profile photo: crop first ("Adjust your photo"), then upload.
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const closeCrop = () => {
    if (cropSrc?.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };
  async function uploadCropped(blob: Blob) {
    if (!(await ensureSaved())) throw new Error("Enter your email at the top first: photos are saved with your form.");
    const up = await uploadImage(blob, "intake", sign);
    set({ ...latest.current, profile: { publicId: up.publicId, url: up.url } });
    closeCrop();
  }

  async function upload(files: Blob[], target: SinglePhotoKey | "gallery") {
    if (!files.length) return;
    setUploadError(null);
    setBusy(target === "gallery" ? "Saving your form…" : target);
    try {
      if (!(await ensureSaved())) return;
      const room = target === "gallery" ? config.galleryMax - latest.current.gallery.length : 1;
      const list = files.slice(0, Math.max(0, room));
      if (target === "gallery" && files.length > list.length) setUploadError(`You can add up to ${config.galleryMax} photos here. Send any others on WhatsApp.`);
      for (let i = 0; i < list.length; i++) {
        if (target === "gallery") setBusy(`Uploading ${i + 1} of ${list.length}…`);
        const up = await uploadImage(await shrink(list[i]!), "intake", sign);
        const photo: IntakePhoto = { publicId: up.publicId, url: up.url };
        set(target === "gallery" ? { ...latest.current, gallery: [...latest.current.gallery, photo] } : { ...latest.current, [target]: photo });
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const waHref = `https://wa.me/${waNumber.replace(/\D/g, "")}?text=${encodeURIComponent(photosWhatsappText(formRef, email, name))}`;

  return (
    <SectionCard
      id="section-photos"
      title="Photos"
      description="Upload them here, or send them to us on WhatsApp. No patient photos or before/after photos (NMC guidelines)."
    >
      <div role="radiogroup" aria-label="How will you share photos?" className="grid gap-3 sm:grid-cols-2">
        {(
          [
            { value: "upload", title: "Upload here", text: "Choose photos from your phone or computer.", icon: <Upload className="size-5" aria-hidden /> },
            { value: "whatsapp", title: "Send on WhatsApp", text: `To ${formatPhone(waNumber)}, with your form reference.`, icon: <WhatsAppIcon className="size-5" /> },
          ] as const
        ).map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={mode === o.value}
            disabled={disabled}
            onClick={() => set({ ...photos, viaWhatsapp: o.value === "whatsapp" })}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
              mode === o.value ? "border-lagoon bg-lagoon/5 ring-1 ring-lagoon" : "border-line bg-surface hover:border-lagoon/40",
            )}
          >
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", o.value === "whatsapp" ? "bg-[#1f8f4e]/10 text-[#1f8f4e]" : "bg-lagoon/10 text-lagoon")}>{o.icon}</span>
            <span>
              <span className="block font-semibold text-ink">{o.title}</span>
              <span className="block text-sm text-body/80">{o.text}</span>
            </span>
          </button>
        ))}
      </div>

      {mode === "whatsapp" && (
        <div className="mt-4 space-y-3 rounded-xl border border-[#1f8f4e]/25 bg-[#1f8f4e]/5 p-4">
          <p className="text-sm text-body">
            Send your photos to <strong className="whitespace-nowrap">{formatPhone(waNumber)}</strong>
            {formRef ? (
              <>
                {" "}
                and mention your form reference <strong className="whitespace-nowrap">{formRef}</strong>.
              </>
            ) : (
              <> and mention the email you use on this form.</>
            )}{" "}
            Send them as &ldquo;Document&rdquo; to keep the full quality.
          </p>
          <a
            href={waHref}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[#1f8f4e] px-4 font-semibold text-white hover:bg-[#187a42]"
          >
            <WhatsAppIcon className="size-5" /> Open WhatsApp
          </a>
          <p className="text-xs text-body/70">You can still upload some photos here as well.</p>
        </div>
      )}

      <div className={cn("mt-5 space-y-5", mode === "whatsapp" && "opacity-90")}>
        <div className="grid gap-4 sm:grid-cols-2">
          {config.singles.map((s) => (
            <SinglePhoto
              key={s.key}
              label={s.label}
              help={s.help}
              value={photos[s.key]}
              busy={busy === s.key}
              disabled={disabled || busy !== null}
              onPick={(f) => (s.key === "profile" ? setCropSrc(URL.createObjectURL(f)) : upload([f], s.key))}
              onAdjust={s.key === "profile" && photos.profile ? () => setCropSrc(photos.profile!.url) : undefined}
              onRemove={() => set({ ...photos, [s.key]: undefined })}
              round={s.key === "profile"}
            />
          ))}
        </div>

        <div>
          <p className="text-sm font-medium text-body">
            {config.galleryLabel} <span className="font-normal text-body/70">({photos.gallery.length}/{config.galleryMax})</span>
          </p>
          <p className="mt-1 flex gap-2 rounded-lg bg-marigold/10 px-3 py-2 text-sm text-body">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-marigold-700" aria-hidden />
            <span>{config.galleryHelp}</span>
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.gallery.map((g, i) => (
              <li key={g.publicId} className="overflow-hidden rounded-xl border border-line bg-paper">
                {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary thumbnail of the applicant's own upload */}
                <img src={thumb(g.url)} alt={g.caption || `Photo ${i + 1}`} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                <div className="space-y-2 p-2">
                  <input
                    aria-label={`Caption for photo ${i + 1}`}
                    placeholder="What is this? e.g. Pune Marathon 2024"
                    value={g.caption ?? ""}
                    maxLength={120}
                    disabled={disabled}
                    onChange={(e) => set({ ...photos, gallery: photos.gallery.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)) })}
                    className={cn(inputClass, "h-9 text-sm")}
                  />
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => set({ ...photos, gallery: photos.gallery.filter((_, j) => j !== i) })}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-clay-text hover:bg-clay/10"
                  >
                    <Trash2 className="size-4" aria-hidden /> Remove
                  </button>
                </div>
              </li>
            ))}
            {photos.gallery.length < config.galleryMax && (
              <li>
                <FilePicker multiple disabled={disabled || busy !== null} onPick={(files) => upload(files, "gallery")}>
                  {busy && !config.singles.some((s) => s.key === busy) ? (
                    <>
                      <Loader2 className="size-6 animate-spin" aria-hidden />
                      <span className="text-sm">{busy}</span>
                    </>
                  ) : (
                    <>
                      <ImagePlus className="size-6" aria-hidden />
                      <span className="text-sm font-semibold">Add photos</span>
                    </>
                  )}
                </FilePicker>
              </li>
            )}
          </ul>
        </div>
        <PhotoCropDialog src={cropSrc} onCancel={closeCrop} onDone={uploadCropped} />
        {(uploadError || error) && (
          <p role="alert" className="text-sm text-clay-text">
            {uploadError || error}
          </p>
        )}
      </div>
    </SectionCard>
  );
}

function FilePicker({ multiple, disabled, onPick, children, className }: { multiple?: boolean; disabled?: boolean; onPick: (files: File[]) => void; children: React.ReactNode; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        className={cn(
          "flex aspect-[4/3] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-lagoon/50 bg-lagoon/5 text-lagoon hover:bg-lagoon/10 disabled:opacity-60",
          className,
        )}
      >
        {children}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          onPick(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </>
  );
}

function SinglePhoto({
  label,
  help,
  value,
  busy,
  disabled,
  onPick,
  onAdjust,
  onRemove,
  round,
}: {
  label: string;
  help: string;
  value?: IntakePhoto;
  busy: boolean;
  disabled?: boolean;
  onPick: (f: File) => void;
  onAdjust?: () => void;
  onRemove: () => void;
  round?: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className={cn("w-28 shrink-0", round && "w-24")}>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary thumbnail of the applicant's own upload
          <img src={thumb(value.url, 320)} alt={label} className={cn("w-full border border-line object-cover", round ? "aspect-square rounded-full" : "aspect-[4/3] rounded-xl")} />
        ) : (
          <FilePicker disabled={disabled} onPick={(f) => f[0] && onPick(f[0])} className={round ? "aspect-square rounded-full" : undefined}>
            {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <ImagePlus className="size-5" aria-hidden />}
            <span className="sr-only">Upload {label}</span>
          </FilePicker>
        )}
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-body">{label}</p>
        <p className="text-xs text-body/70">{help}</p>
        {value && (
          <div className="flex flex-wrap gap-1 pt-1">
            {onAdjust && (
              <button type="button" disabled={disabled} onClick={onAdjust} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-lagoon hover:bg-lagoon/10">
                <Crop className="size-4" aria-hidden /> Adjust
              </button>
            )}
            <ReplaceButton disabled={disabled} busy={busy} onPick={onPick} />
            <button type="button" disabled={disabled} onClick={onRemove} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-clay-text hover:bg-clay/10">
              <Trash2 className="size-4" aria-hidden /> Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ReplaceButton({ disabled, busy, onPick }: { disabled?: boolean; busy: boolean; onPick: (f: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" disabled={disabled} onClick={() => input.current?.click()} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-lagoon hover:bg-lagoon/10">
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />} Replace
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
    </>
  );
}
