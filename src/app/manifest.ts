import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/site";

/** Web app manifest, so "Add to home screen" uses the MediReach icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} – Websites and visiting cards for doctors`,
    short_name: SITE_NAME,
    start_url: "/",
    display: "browser",
    background_color: "#F7F9FA",
    theme_color: "#0A3F3F",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
