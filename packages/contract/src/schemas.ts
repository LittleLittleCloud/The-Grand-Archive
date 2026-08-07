import { z } from "zod";

// ─── Entry ──────────────────────────────────────────────

export const EntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string().nullable(),
  url: z.string().nullable(),
  source: z.string(),
  category: z.enum([
    "finance",
    "news",
    "tech",
    "social",
    "blog",
    "podcast",
    "uncategorized",
  ]),
  tags: z.array(z.string()).default([]),
  author: z.string().nullable(),
  language: z.string().default("en"),
  published: z.string(), // ISO 8601
  created_at: z.string().optional(),
});

export const EntryCreateSchema = EntrySchema.omit({ created_at: true });

// ─── Search ─────────────────────────────────────────────

export const SearchRequestSchema = z.object({
  q: z.string().min(1),
  category: z.string().optional(),
  source: z.string().optional(),
  from: z.string().optional(), // ISO 8601
  to: z.string().optional(), // ISO 8601
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const SearchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  source: z.string(),
  category: z.string(),
  published: z.string(),
  score: z.number(),
});

export const SearchResponseSchema = z.object({
  results: z.array(SearchResultSchema),
  total: z.number(),
  query: z.string(),
  tier: z.enum(["anonymous", "free", "premium"]),
  tierCutoff: z.string().nullable(), // ISO date; null = no restriction
});

// ─── Feeds ──────────────────────────────────────────────

export const FeedsRequestSchema = z.object({
  category: z.string().optional(),
  source: z.string().optional(),
  from: z.string().optional(), // ISO 8601
  to: z.string().optional(), // ISO 8601
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const FeedsResponseSchema = z.object({
  entries: z.array(EntrySchema),
  total: z.number(),
});

// ─── Stats ──────────────────────────────────────────────

export const CategoryStatSchema = z.object({
  category: z.string(),
  count: z.number(),
});

export const SourceStatSchema = z.object({
  source: z.string(),
  count: z.number(),
});

export const StatsResponseSchema = z.object({
  total: z.number(),
  byCategory: z.array(CategoryStatSchema),
  bySource: z.array(SourceStatSchema),
  lastUpdated: z.string().nullable(),
});

// ─── Ingest ─────────────────────────────────────────────

export const IngestRequestSchema = z.object({
  entries: z.array(EntryCreateSchema).min(1).max(1000),
});

export const IngestResponseSchema = z.object({
  inserted: z.number(),
  duplicates: z.number(),
});

// ─── Auth (Better Auth handles user/session; we only define API key schemas) ─

export const ApiKeyCreateRequestSchema = z.object({
  name: z.string().min(1).max(64),
});

export const ApiKeySchema = z.object({
  id: z.string(),
  name: z.string(),
  prefix: z.string(),
  last_used: z.string().nullable(),
  created_at: z.string(),
});

export const ApiKeyCreateResponseSchema = z.object({
  key: z.string(), // full key, shown only once
  id: z.string(),
  name: z.string(),
  prefix: z.string(),
});

// ─── Feed Status ────────────────────────────────────────

export const FeedStatusSchema = z.object({
  source: z.string(),
  category: z.string(),
  entryCount: z.number(),
  earliest: z.string().nullable(),
  latest: z.string().nullable(),
  lastIngested: z.string().nullable(),
});

export const DailyBinSchema = z.object({
  source: z.string(),
  day: z.string(),
  count: z.number(),
});

export const FeedsStatusResponseSchema = z.object({
  feeds: z.array(FeedStatusSchema),
  dailyBins: z.array(DailyBinSchema),
});

// ─── Daily Digest ───────────────────────────────────────

/** Languages a digest edition can be produced in. */
export const DigestLangSchema = z.enum(["en", "zh"]);

/** An attributed point within a section (a "bullet" with its source). */
export const DigestItemSchema = z.object({
  text: z.string(),
  source: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  entryId: z.string().nullable().optional(),
});

/** A pull-quote with optional attribution. */
export const DigestQuoteSchema = z.object({
  text: z.string(),
  source: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
});

/** A themed section: optional editorial prose plus attributed points. */
export const DigestSectionSchema = z.object({
  heading: z.string(),
  body: z.string().nullable().optional(),
  items: z.array(DigestItemSchema).default([]),
});

/** Structured content the agent produces and the renderer consumes. */
export const DigestContentSchema = z.object({
  title: z.string(),
  subtitle: z.string().nullable().optional(),
  standfirst: z.string(),
  highlights: z.array(z.string()).default([]),
  quote: DigestQuoteSchema.nullable().optional(),
  sections: z.array(DigestSectionSchema),
  footerNote: z.string().nullable().optional(),
});

/** POST /api/digest/subscribe */
export const DigestSubscribeRequestSchema = z.object({
  email: z.string().email(),
  lang: DigestLangSchema.default("en"),
});

export const DigestSubscribeResponseSchema = z.object({
  status: z.enum(["pending", "active"]),
  message: z.string(),
});

/** Listing item for the public archive. */
export const DigestEditionSummarySchema = z.object({
  date: z.string(), // YYYY-MM-DD
  lang: DigestLangSchema,
  title: z.string(),
  summary: z.string().nullable(),
});

export const DigestEditionsResponseSchema = z.object({
  editions: z.array(DigestEditionSummarySchema),
});

/** A full edition, including rendered HTML and structured sections. */
export const DigestEditionSchema = DigestEditionSummarySchema.extend({
  html: z.string(),
  sections: z.array(DigestSectionSchema),
  created_at: z.string(),
});

// ─── Error ──────────────────────────────────────────────

export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
  message: z.string().optional(),
});

export const RateLimitErrorSchema = ErrorResponseSchema.extend({
  upgrade: z.string().optional(),
  limit: z.number(),
  reset: z.number(),
});
