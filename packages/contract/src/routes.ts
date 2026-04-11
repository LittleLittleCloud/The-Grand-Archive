/** Route constants & HTTP method definitions */

export const ROUTES = {
  // Public
  SEARCH: "/api/search",
  FEEDS: "/api/feeds",
  FEED_BY_ID: "/api/feeds/:id",
  STATS: "/api/stats",

  // API Keys (session-protected)
  API_KEYS: "/api/api-keys",
  API_KEY_BY_ID: "/api/api-keys/:id",

  // Ingest (api-key-protected)
  ENTRIES: "/api/entries",
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
