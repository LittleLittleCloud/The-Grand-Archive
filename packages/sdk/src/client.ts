import type {
  SearchRequest,
  SearchResponse,
  FeedsRequest,
  FeedsResponse,
  Entry,
  StatsResponse,
} from "./types";
import { ROUTES } from "@dak/contract";

export interface DakClientOptions {
  baseUrl: string;
  apiKey?: string;
}

export class DakClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(options: DakClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.headers = {
      "Content-Type": "application/json",
    };
    if (options.apiKey) {
      this.headers["Authorization"] = `Bearer ${options.apiKey}`;
    }
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...this.headers, ...init?.headers },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg =
        (body as Record<string, string>).error ?? `HTTP ${res.status}`;
      throw new DakError(msg, res.status, body);
    }

    return res.json() as Promise<T>;
  }

  private buildQuery(params: object): string {
    const entries = Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null
    );
    if (entries.length === 0) return "";
    return "?" + new URLSearchParams(
      entries.map(([k, v]): [string, string] => [k, String(v)])
    ).toString();
  }

  // ─── Search ───────────────────────────────────────────

  async search(params: SearchRequest): Promise<SearchResponse> {
    const qs = this.buildQuery(params);
    return this.request<SearchResponse>(`${ROUTES.SEARCH}${qs}`);
  }

  // ─── Feeds ────────────────────────────────────────────

  async getFeeds(params?: Partial<FeedsRequest>): Promise<FeedsResponse> {
    const qs = this.buildQuery(params ?? {});
    return this.request<FeedsResponse>(`${ROUTES.FEEDS}${qs}`);
  }

  async getFeed(id: string): Promise<Entry> {
    return this.request<Entry>(
      ROUTES.FEED_BY_ID.replace(":id", encodeURIComponent(id))
    );
  }

  async getFeedsByCategory(
    category: string,
    params?: Omit<Partial<FeedsRequest>, "category">
  ): Promise<FeedsResponse> {
    return this.getFeeds({ ...params, category });
  }

  async getFeedsBySource(
    source: string,
    params?: Omit<Partial<FeedsRequest>, "source">
  ): Promise<FeedsResponse> {
    return this.getFeeds({ ...params, source });
  }

  // ─── Stats ────────────────────────────────────────────

  async getStats(): Promise<StatsResponse> {
    return this.request<StatsResponse>(ROUTES.STATS);
  }
}

export class DakError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "DakError";
    this.status = status;
    this.body = body;
  }
}
