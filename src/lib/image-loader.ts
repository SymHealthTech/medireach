/**
 * next/image loader (next.config.mjs → images.loaderFile). Cloudinary URLs get
 * on-the-fly resizing + auto format/quality; anything else is served as-is.
 */
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }): string {
  const marker = "/image/upload/";
  const i = src.indexOf(marker);
  if (src.includes("res.cloudinary.com") && i !== -1) {
    const transform = `f_auto,q_${quality ?? "auto"},c_limit,w_${width}`;
    return `${src.slice(0, i + marker.length)}${transform}/${src.slice(i + marker.length)}`;
  }
  return src.includes("?") ? `${src}&w=${width}` : `${src}?w=${width}`;
}
