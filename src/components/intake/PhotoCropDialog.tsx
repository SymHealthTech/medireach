"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MAX_OUTPUT = 1600;

/** Cut the chosen square out of the image (JPEG, max 1600 px). Works for local files and Cloudinary URLs (CORS). */
async function cropToBlob(src: string, area: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not read that photo. Please choose it again."));
    el.src = src;
  });
  const size = Math.min(MAX_OUTPUT, Math.round(area.width));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas.getContext("2d")!.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process the photo."))), "image/jpeg", 0.9));
}

/**
 * Adjust a profile photo: drag it so the face is in the middle of the circle,
 * zoom with the slider (or pinch on a phone), then save.
 */
export function PhotoCropDialog({ src, onCancel, onDone }: { src: string | null; onCancel: () => void; onDone: (blob: Blob) => Promise<void> }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onComplete = useCallback((_: Area, px: Area) => setArea(px), []);

  async function save() {
    if (!src || !area) return;
    setBusy(true);
    setError(null);
    try {
      await onDone(await cropToBlob(src, area));
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={src !== null} onOpenChange={(o) => !o && !busy && onCancel()}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] gap-3 overflow-y-auto rounded-2xl border-line bg-surface p-4 sm:max-w-lg sm:p-5">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="font-display text-xl font-semibold text-ink">Adjust your photo</DialogTitle>
          <DialogDescription className="text-sm text-body/80">Drag the photo to keep your face in the centre of the circle. Zoom in or out if needed.</DialogDescription>
        </DialogHeader>
        {src && (
          <div className="relative h-[min(60dvh,380px)] w-full overflow-hidden rounded-xl bg-ink">
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              minZoom={1}
              maxZoom={4}
              aspect={1}
              cropShape="round"
              showGrid={false}
              objectFit="contain"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onComplete}
              mediaProps={{ crossOrigin: "anonymous" }}
            />
          </div>
        )}
        <div className="flex items-center gap-3">
          <ZoomOut className="size-4 shrink-0 text-body/70" aria-hidden />
          <input
            type="range"
            min={1}
            max={4}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="w-full accent-[#0E7C7B]"
          />
          <ZoomIn className="size-4 shrink-0 text-body/70" aria-hidden />
        </div>
        {error && (
          <p role="alert" className="text-sm text-clay-text">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="min-h-11 rounded-[10px] px-4 text-sm font-semibold text-body hover:bg-paper">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy || !area}
            className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-marigold px-5 text-sm font-semibold text-white hover:bg-marigold-700 disabled:opacity-60"
          >
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Save photo
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
