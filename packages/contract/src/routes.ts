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

  // OAuth clients (session-protected)
  OAUTH_CLIENTS: "/api/oauth/clients",
  OAUTH_CLIENT_BY_ID: "/api/oauth/clients/:clientId",

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

  // User-published digests (CRUD; API-key or session auth)
  USER_DIGESTS: "/api/digests",
  USER_DIGEST_SCHEMA: "/api/digests/schema",
  USER_DIGEST_BY_ID: "/api/digests/:id",
  USER_DIGEST_SHARE: "/api/digests/:id/share",
  USER_DIGEST_PUBLIC: "/api/digests/public/:shareId",
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
