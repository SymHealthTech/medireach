"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadImage } from "@/lib/client/upload-image";
import type { ImageValue } from "@/lib/doctors/form";
import type { UploadPurpose } from "@/lib/integrations/cloudinary";

/** One wide image (e.g. a cover photo). No cropping; uploadImage compresses it. */
export function ImageUpload({
  value,
  onChange,
  purpose,
  disabled,
  label = "Upload photo",
}: {
  value?: ImageValue;
  onChange: (v: ImageValue | undefined) => void;
  purpose: UploadPurpose;
  disabled?: boolean;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const up = await uploadImage(file, purpose);
      onChange({ publicId: up.publicId, url: up.url });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin preview
        <img src={value.url} alt="" className="aspect-[16/6] w-full rounded-lg border border-line object-cover" />
      ) : (
        <div className="flex aspect-[16/6] w-full items-center justify-center rounded-lg border border-dashed border-line bg-sage/40 text-sm text-muted-foreground">
          No photo yet
        </div>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="outline" disabled={disabled || busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />} {value ? "Replace" : label}
        </Button>
        {value && (
          <Button type="button" variant="ghost" className="text-clay-text" disabled={disabled || busy} onClick={() => onChange(undefined)}>
            <Trash2 /> Remove
          </Button>
        )}
      </div>
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
