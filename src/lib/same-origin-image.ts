/**
 * Every picture on the web card is drawn from the page's own origin, so the
 * card's "Download" buttons (which must read each picture back) never need
 * CORS from anywhere:
 * - photos and logos on the platform's R2 storage go through /api/media, a
 *   same-origin copy (the route only serves the platform's own folders);
 * - the trimmed pass logo is built as an absolute link on the configured app
 *   address, which may differ from the address the visitor is on (apex versus
 *   www); only its path is kept, so it is same-origin wherever the page is.
 * Anything else is left as is.
 */
export function sameOriginImage(url: string): string {
  const ownRoute = url.match(/^https?:\/\/[^/]+(\/api\/wallet\/logo\/.+)$/);
  if (ownRoute) return ownRoute[1];
  if (!/^https:\/\/[^/]+\/(wallet-photos|logos|stamp-icons)\//.test(url)) return url;
  return `/api/media?u=${encodeURIComponent(url)}`;
}
