"use client";

import { useCallback, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { uploadImage, type UploadSigner } from "@/lib/client/upload-image";
import type { ImageValue } from "@/lib/doctors/form";
import type { UploadPurpose } from "@/lib/integrations/cloudinary";

const MIN_RECOMMENDED = 1200;
const MAX_OUTPUT = 1600;

/** Crop the selected area to a square, lossless PNG (max 1600px); uploadImage then compresses it once. */
async function cropToBlob(src: string, area: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = src;
  });
  const size = Math.min(MAX_OUTPUT, Math.round(area.width));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process the photo."))), "image/png"),
  );
}

/**
 * Profile photo: pick (or take on a phone) → square crop → upload. Shows a
 * warning when the source is too small for a sharp Google thumbnail.
 */
export function PhotoCropUpload({
  value,
  onChange,
  disabled,
  purpose = "doctor-photo",
}: {
  value?: ImageValue;
  onChange: (v: ImageValue | undefined) => void;
  disabled?: boolean;
  /** Cloudinary folder; clinic logos use "logo". */
  purpose?: UploadPurpose;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [small, setSmall] = useState(false);

  const onCropComplete = useCallback((_: Area, px: Area) => setArea(px), []);

  function pick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file.");
    const url = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => setSmall(Math.max(probe.width, probe.height) < MIN_RECOMMENDED);
    probe.src = url;
    setSrc(url);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  }

  async function confirm() {
    if (!src || !area) return;
    setBusy(true);
    try {
      const blob = await cropToBlob(src, area);
      const up = await uploadImage(blob, purpose);
      onChange({ publicId: up.publicId, url: up.url });
      setSrc(null);
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative size-28 overflow-hidden rounded-full bg-sage ring-2 ring-marigold ring-offset-4 ring-offset-background">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- small admin preview
          <img src={value.url} alt="Profile photo" className="size-full object-cover" />
        ) : (
          <Camera className="absolute inset-0 m-auto size-8 text-ink/50" strokeWidth={1.5} />
        )}
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={disabled} onClick={() => input.current?.click()}>
            <Upload /> {value ? "Change photo" : "Upload photo"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" disabled={disabled} onClick={() => onChange(undefined)}>
              <Trash2 /> Remove
            </Button>
          )}
        </div>
        <p className="max-w-xs text-xs text-muted-foreground">
          Square, at least 1200 px, face clearly visible. Only the doctor — never patients.
        </p>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <Dialog open={Boolean(src)} onOpenChange={(o) => !o && !busy && setSrc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crop photo</DialogTitle>
            <DialogDescription>Drag to position, pinch or use the slider to zoom.</DialogDescription>
          </DialogHeader>
          <div className="relative h-72 overflow-hidden rounded-xl bg-black sm:h-80">
            {src && (
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="w-full accent-[var(--ink)]"
          />
          {small && (
            <p className="text-sm text-clay-text">This photo is smaller than 1200 px. It will work, but a larger one looks sharper on Google.</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSrc(null)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={confirm} disabled={busy || !area}>
              {busy && <Loader2 className="animate-spin" />} Use photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Simple single-image upload (award photos, template previews). No crop. */
export function SimpleImageUpload({
  value,
  onChange,
  purpose,
  label = "Add photo",
  disabled,
  sign,
  onError = (message) => toast.error(message),
}: {
  value?: ImageValue;
  onChange: (v: ImageValue | undefined) => void;
  purpose: "award" | "template-preview" | "gallery" | "interests";
  label?: string;
  disabled?: boolean;
  /** Upload signer; defaults to the admin one. */
  sign?: UploadSigner;
  /** Where upload errors go (pages without a toaster pass their own). */
  onError?: (message: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const up = await uploadImage(file, purpose, sign);
      onChange({ publicId: up.publicId, url: up.url });
    } catch (e) {
      onError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex items-center gap-3">
      {value && (
        // eslint-disable-next-line @next/next/no-img-element -- small admin preview
        <img src={value.url} alt="" className="size-14 rounded-lg object-cover" />
      )}
      <Button type="button" size="sm" variant="outline" disabled={disabled || busy} onClick={() => input.current?.click()}>
        {busy ? <Loader2 className="animate-spin" /> : <Upload />} {value ? "Replace" : label}
      </Button>
      {value && (
        <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => onChange(undefined)} aria-label="Remove photo">
          <Trash2 />
        </Button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
