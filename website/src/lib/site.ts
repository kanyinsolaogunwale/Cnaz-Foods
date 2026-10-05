/**
 * Cnaz Foods business details used across the UI.
 *
 * The phone number and email are intentionally NOT hardcoded — set the real
 * values in `.env.local` (NEXT_PUBLIC_CONTACT_PHONE / NEXT_PUBLIC_CONTACT_EMAIL).
 */
export const site = {
  name: "Cnaz Foods",
  tagline: "Quick bite, endless delight.",
  description:
    "Cnaz Foods sells packaged snacks including plantain chips, peanuts and groundnuts.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, ""),
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
};

export const hasContactDetails = Boolean(site.phone || site.email);

/** Build a safe tel: href from a display phone number. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
