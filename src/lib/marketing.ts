/**
 * Public-website contact details (spec §4). Read from NEXT_PUBLIC_ env so they
 * can be configured per deployment; sensible placeholders keep the site working
 * in development.
 */
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919800000000";
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "admin.medireach@gmail.com";

export function whatsappLink(message = "Hi, I'd like a demo of MediReach."): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
