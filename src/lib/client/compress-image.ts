/**
 * Compress images in the browser before they are uploaded to Cloudinary, so
 * nobody has to resize photos themselves and a 6 MB phone photo goes up as
 * a few hundred KB.
 *
 *  - Resized so the longest side is at most `maxSide` (2000 px by default).
 *  - Re-encoded as WebP (smaller), or JPEG where the browser can't make WebP
 *    (older Safari). Logos keep transparency (WebP, else PNG).
 *  - The photo is turned the right way up (EXIF orientation) while drawing.
 *  - Never made worse: if the result isn't smaller and the image was already
 *    small enough, the original is uploaded. Formats the browser can't open
 *    (e.g. HEIC on Chrome) go up as they are; Cloudinary still accepts them.
 */

export interface CompressOptions {
  /** Longest side in pixels. */
  maxSide?: number;
  /** 0–1, for WebP/JPEG. */
  quality?: number;
  /** Keep transparency (logos). Photos get a white background instead. */
  keepAlpha?: boolean;
}

export const COMPRESS_DEFAULTS = { maxSide: 2000, quality: 0.82 } as const;
/** Already-compressed JPEG/WebP files under this size, within maxSide, are left alone (no second lossy pass). */
export const SMALL_ENOUGH_BYTES = 350 * 1024;

export interface ImageInfo {
  width: number;
  height: number;
  size: number;
  type: string;
}

/** Output size: longest side capped at maxSide, aspect kept. */
export function targetSize(width: number, height: number, maxSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Whether re-encoding is worth it (pure; tested). */
export function needsCompression(info: ImageInfo, opts: CompressOptions = {}): boolean {
  const maxSide = opts.maxSide ?? COMPRESS_DEFAULTS.maxSide;
  if (Math.max(info.width, info.height) > maxSide) return true;
  if (info.size > SMALL_ENOUGH_BYTES) return true;
  // Small PNG/GIF/BMP photos still shrink a lot as WebP/JPEG; logos may stay PNG.
  return !["image/jpeg", "image/webp"].includes(info.type) && !opts.keepAlpha;
}

async function decode(file: Blob): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // fall back to <img> below
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
  } finally {
    // The <img> keeps its decoded pixels after the URL is revoked.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

export async function compressImage(file: Blob, opts: CompressOptions = {}): Promise<Blob> {
  const maxSide = opts.maxSide ?? COMPRESS_DEFAULTS.maxSide;
  const quality = opts.quality ?? COMPRESS_DEFAULTS.quality;
  let img: Awaited<ReturnType<typeof decode>>;
  try {
    img = await decode(file);
  } catch {
    return file; // the browser can't read it (e.g. HEIC); upload as is
  }
  const info = { width: img.width, height: img.height, size: file.size, type: file.type };
  if (!needsCompression(info, { ...opts, maxSide })) return file;

  const { width, height } = targetSize(img.width, img.height, maxSide);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  if (!opts.keepAlpha) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);
  if ("close" in img && typeof img.close === "function") img.close();

  let out = await toBlob(canvas, "image/webp", quality);
  if (!out || out.type !== "image/webp") out = await toBlob(canvas, opts.keepAlpha ? "image/png" : "image/jpeg", quality);
  if (!out) return file;
  // Never upload something bigger than the original when no resize was needed.
  if (out.size >= file.size && Math.max(info.width, info.height) <= maxSide) return file;
  return out;
}
