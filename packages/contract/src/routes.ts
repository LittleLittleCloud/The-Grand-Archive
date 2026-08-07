/** Route constants & HTTP method definitions */

export const ROUTES = {
  // Public
  SEARCH: "/api/search",
  FEEDS: "/api/feeds",
  FEED_BY_ID: "/api/feeds/:id",
  FEEDS_STATUS: "/api/feeds/status",
  STATS: "/api/stats",

  // API Keys (session-protected)
  API_KEYS: "/api/api-keys",
  API_KEY_BY_ID: "/api/api-keys/:id",

  // Ingest (api-key-protected)
  ENTRIES: "/api/entries",

  // Daily digest
  DIGEST_SUBSCRIBE: "/api/digest/subscribe",
  DIGEST_CONFIRM: "/api/digest/confirm",
  DIGEST_UNSUBSCRIBE: "/api/digest/unsubscribe",
  DIGEST_EDITIONS: "/api/digest/editions",
  DIGEST_EDITION_BY_DATE_LANG: "/api/digest/editions/:date/:lang",
  DIGEST_ADMIN: "/api/admin/digest",
  DIGEST_ADMIN_RUN: "/api/admin/digest/run",
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
