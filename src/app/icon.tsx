import { ImageResponse } from "next/og";
import { brandIconElement } from "@/lib/brand-icon";

/** 512×512 site icon (favicon for modern browsers, Google result favicon). */
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(brandIconElement(512), size);
}
