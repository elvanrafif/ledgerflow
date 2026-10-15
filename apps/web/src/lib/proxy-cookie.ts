/**
 * Drops a `Domain=…` attribute (if any) from a Set-Cookie header so the browser
 * scopes the cookie to the web origin rather than the API's own domain. Other
 * attributes (HttpOnly, Secure, SameSite, Path, Max-Age) are preserved.
 *
 * Used by the same-origin API proxy (app/api/proxy/[...path]) so the session
 * cookie set by the API becomes readable by this app's Server Components.
 */
export function rewriteCookieDomain(setCookie: string): string {
  return setCookie
    .split(";")
    .map((part) => part.trim())
    .filter((part) => !/^domain=/i.test(part))
    .join("; ");
}
