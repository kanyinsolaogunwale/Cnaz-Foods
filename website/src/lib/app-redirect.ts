/**
 * Validation for app-return redirects (`app_redirect`).
 *
 * The Cnaz Foods mobile app starts Google sign-in on the website's /login
 * page and tells it where to hand the finished session back. Only two shapes
 * are ever accepted:
 *
 * - the app's own deep-link URIs: `exp://…` (Expo Go) and `cnazfoods://…`
 *   (installed app)
 * - plain http(s) URLs on loopback or private LAN addresses (the Expo web
 *   preview during development)
 *
 * Anything else (arbitrary https sites, javascript:, data:, etc.) is
 * rejected, so the login page can never be used to bounce a session to a
 * third-party origin.
 */
// exp:// URLs from Expo Go include host:PORT (e.g. exp://192.168.0.5:8081)
// and can carry query params, so `:`, `?`, `=`, `&` are all allowed here.
// The scheme is still anchored at the start, so web origins stay excluded.
const NATIVE_SCHEME_RE = /^(exp|cnazfoods):\/\/[\w\-./:%?=&~]+$/i;
const DEV_WEB_ORIGIN_RE =
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?(\/|$)/i;

export function safeAppRedirect(value: string | null | undefined): string | null {
  if (!value) return null;
  const target = value.trim().slice(0, 512);
  if (NATIVE_SCHEME_RE.test(target)) return target;
  if (DEV_WEB_ORIGIN_RE.test(target) && !/[\s"'<>\\]/.test(target)) return target;
  return null;
}
