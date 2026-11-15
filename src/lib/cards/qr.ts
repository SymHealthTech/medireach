import QRCode from "qrcode";
import type { CardQr } from "@/templates/types";

/**
 * QR code as a compact SVG path (horizontal runs merged), so card templates
 * can draw it inline in both HTML and Satori images — crisp at any size.
 * Error correction M: survives smudges and print without getting too dense.
 */
export function qrForUrl(url: string): CardQr {
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const { size, data } = qr.modules;
  let path = "";
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (!data[y * size + x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < size && data[y * size + x]) x++;
      path += `M${start} ${y}h${x - start}v1h-${x - start}z`;
    }
  }
  return { size, path, url };
}
