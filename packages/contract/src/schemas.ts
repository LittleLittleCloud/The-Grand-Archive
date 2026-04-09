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

// ─── Auth ───────────────────────────────────────────────

export const RegisterRequestSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(8),
  email: z.string().email().nullable().optional(),
});

export const LoginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(8),
});

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  role: z.enum(["admin", "user"]),
  plan: z.enum(["free", "premium"]),
  req_balance: z.number(),
  created_at: z.string(),
});

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
