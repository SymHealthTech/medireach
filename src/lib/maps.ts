/** Google Maps embed for a pinned place, else searched by its address (clinic, hospital and doctor pages). */
export function mapEmbedUrl(geo: { lat: number; lng: number } | undefined, address: string): string {
  const q = geo ? `${geo.lat},${geo.lng}` : address;
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`;
}
