import type {
  SearchResponse,
  FeedsResponse,
  Entry,
  StatsResponse,
  ApiKey,
  ApiKeyCreateResponse,
  OAuthClient,
  OAuthClientCreateRequest,
  FeedsStatusResponse,
  DigestLang,
  DigestSubscribeResponse,
  DigestEditionsResponse,
  DigestEdition,
  UserDigest,
  UserDigestListResponse,
  UserDigestCreateRequest,
  UserDigestUpdateRequest,
  UserDigestVisibility,
} from "@dak/contract";
import { ROUTES } from "@dak/contract";

const BASE = "/api";

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path.replace(/^\/api/, "")}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(
      (body as Record<string, string>).error ?? `HTTP ${res.status}`,
      res.status,
      body
    );
  }

  return res.json() as Promise<T>;
}

function qs(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export const api = {
  // ─── Public ───────────────────────────────────────────

  search: (params: {
    q: string;
    category?: string;
    source?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) => request<SearchResponse>(`${ROUTES.SEARCH}${qs(params)}`),

  getFeeds: (params?: {
    category?: string;
    source?: string;
    limit?: number;
    offset?: number;
  }) => request<FeedsResponse>(`${ROUTES.FEEDS}${qs(params ?? {})}`),

  getFeed: (id: string) =>
    request<Entry>(ROUTES.FEED_BY_ID.replace(":id", encodeURIComponent(id))),

  getStats: () => request<StatsResponse>(ROUTES.STATS),

  getFeedsStatus: () => request<FeedsStatusResponse>(ROUTES.FEEDS_STATUS),

  // ─── API Keys ─────────────────────────────────────────

  createApiKey: (name: string) =>
    request<ApiKeyCreateResponse>(ROUTES.API_KEYS, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  listApiKeys: () => request<ApiKey[]>(ROUTES.API_KEYS),

  deleteApiKey: (id: string) =>
    request<{ ok: boolean }>(
      ROUTES.API_KEY_BY_ID.replace(":id", encodeURIComponent(id)),
      { method: "DELETE" }
    ),

  // ─── OAuth clients ────────────────────────────────────

  listOAuthClients: () => request<OAuthClient[]>(ROUTES.OAUTH_CLIENTS),

  createOAuthClient: (body: OAuthClientCreateRequest) =>
    request<OAuthClient>(ROUTES.OAUTH_CLIENTS, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteOAuthClient: (clientId: string) =>
    request<{ ok: boolean }>(
      ROUTES.OAUTH_CLIENT_BY_ID.replace(":clientId", encodeURIComponent(clientId)),
      { method: "DELETE" }
    ),

  // ─── Daily Digest ─────────────────────────────────────

  subscribeDigest: (email: string, lang: DigestLang) =>
    request<DigestSubscribeResponse>(ROUTES.DIGEST_SUBSCRIBE, {
      method: "POST",
      body: JSON.stringify({ email, lang }),
    }),

  getDigestEditions: (lang?: DigestLang) =>
    request<DigestEditionsResponse>(`${ROUTES.DIGEST_EDITIONS}${qs({ lang })}`),

  getDigestEdition: (date: string, lang: DigestLang) =>
    request<DigestEdition>(
      ROUTES.DIGEST_EDITION_BY_DATE_LANG.replace(":date", encodeURIComponent(date)).replace(
        ":lang",
        encodeURIComponent(lang)
      )
    ),

  // ─── Digest admin (INGEST_ALLOWED_USERS) ──────────────

  getDigestAdmin: () => request<{ canTrigger: boolean }>(ROUTES.DIGEST_ADMIN),

  runDigest: (params?: { date?: string; lang?: DigestLang }) =>
    request<{ id?: string }>(ROUTES.DIGEST_ADMIN_RUN, {
      method: "POST",
      body: JSON.stringify(params ?? {}),
    }),

  // ─── User-published digests ───────────────────────────

  listUserDigests: () => request<UserDigestListResponse>(ROUTES.USER_DIGESTS),

  getUserDigest: (id: string) =>
    request<UserDigest>(ROUTES.USER_DIGEST_BY_ID.replace(":id", encodeURIComponent(id))),

  createUserDigest: (body: UserDigestCreateRequest) =>
    request<UserDigest>(ROUTES.USER_DIGESTS, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateUserDigest: (id: string, body: UserDigestUpdateRequest) =>
    request<UserDigest>(ROUTES.USER_DIGEST_BY_ID.replace(":id", encodeURIComponent(id)), {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteUserDigest: (id: string) =>
    request<{ ok: boolean }>(
      ROUTES.USER_DIGEST_BY_ID.replace(":id", encodeURIComponent(id)),
      { method: "DELETE" }
    ),

  shareUserDigest: (id: string, visibility: UserDigestVisibility) =>
    request<UserDigest>(ROUTES.USER_DIGEST_SHARE.replace(":id", encodeURIComponent(id)), {
      method: "POST",
      body: JSON.stringify({ visibility }),
    }),

  getPublicUserDigest: (shareId: string) =>
    request<UserDigest>(
      ROUTES.USER_DIGEST_PUBLIC.replace(":shareId", encodeURIComponent(shareId))
    ),
};
