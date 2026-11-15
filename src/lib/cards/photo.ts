/**
 * Square JPEG crop of a Cloudinary photo, face-centred. Satori (OG images,
 * card PNGs) can't decode WebP/AVIF, so image renderers always use this.
 */
export function cloudinaryJpg(url: string, size: number): string {
  const marker = "/image/upload/";
  const i = url.indexOf(marker);
  if (!url.includes("res.cloudinary.com") || i === -1) return url;
  return `${url.slice(0, i + marker.length)}f_jpg,q_85,c_fill,g_face,w_${size},h_${size}/${url.slice(i + marker.length)}`;
}
