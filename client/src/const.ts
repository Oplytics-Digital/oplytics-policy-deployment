export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Generate login URL pointing to the Oplytics Portal login page.
 * Uses VITE_PORTAL_LOGIN_URL (portal.oplytics.digital) for cross-subdomain SSO
 * instead of the Manus OAuth route.
 */
export function getLoginUrl(returnTo?: string) {
  const base =
    import.meta.env.VITE_PORTAL_LOGIN_URL ??
    "https://portal.oplytics.digital";
  const url = new URL("/login", base);
  if (returnTo)
    url.searchParams.set("returnTo", returnTo ?? window.location.origin);
  return url.toString();
}
