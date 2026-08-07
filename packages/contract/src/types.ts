import type { z } from "zod";
import type {
  EntrySchema,
  EntryCreateSchema,
  SearchRequestSchema,
  SearchResultSchema,
  SearchResponseSchema,
  FeedsRequestSchema,
  FeedsResponseSchema,
  StatsResponseSchema,
  CategoryStatSchema,
  SourceStatSchema,
  IngestRequestSchema,
  IngestResponseSchema,
  ApiKeyCreateRequestSchema,
  ApiKeySchema,
  ApiKeyCreateResponseSchema,
  ErrorResponseSchema,
  RateLimitErrorSchema,
  FeedStatusSchema,
  DailyBinSchema,
  FeedsStatusResponseSchema,
  DigestLangSchema,
  DigestItemSchema,
  DigestSectionSchema,
  DigestContentSchema,
  DigestSubscribeRequestSchema,
  DigestSubscribeResponseSchema,
  DigestEditionSummarySchema,
  DigestEditionsResponseSchema,
  DigestEditionSchema,
} from "./schemas";

export type Entry = z.infer<typeof EntrySchema>;
export type EntryCreate = z.infer<typeof EntryCreateSchema>;
export type SearchRequest = z.input<typeof SearchRequestSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
export type FeedsRequest = z.input<typeof FeedsRequestSchema>;
export type FeedsResponse = z.infer<typeof FeedsResponseSchema>;
export type StatsResponse = z.infer<typeof StatsResponseSchema>;
export type CategoryStat = z.infer<typeof CategoryStatSchema>;
export type SourceStat = z.infer<typeof SourceStatSchema>;
export type IngestRequest = z.infer<typeof IngestRequestSchema>;
export type IngestResponse = z.infer<typeof IngestResponseSchema>;
export type ApiKeyCreateRequest = z.infer<typeof ApiKeyCreateRequestSchema>;
export type ApiKey = z.infer<typeof ApiKeySchema>;
export type ApiKeyCreateResponse = z.infer<typeof ApiKeyCreateResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type RateLimitError = z.infer<typeof RateLimitErrorSchema>;
export type FeedStatus = z.infer<typeof FeedStatusSchema>;
export type DailyBin = z.infer<typeof DailyBinSchema>;
export type FeedsStatusResponse = z.infer<typeof FeedsStatusResponseSchema>;
export type DigestLang = z.infer<typeof DigestLangSchema>;
export type DigestItem = z.infer<typeof DigestItemSchema>;
export type DigestSection = z.infer<typeof DigestSectionSchema>;
export type DigestContent = z.infer<typeof DigestContentSchema>;
export type DigestSubscribeRequest = z.input<typeof DigestSubscribeRequestSchema>;
export type DigestSubscribeResponse = z.infer<typeof DigestSubscribeResponseSchema>;
export type DigestEditionSummary = z.infer<typeof DigestEditionSummarySchema>;
export type DigestEditionsResponse = z.infer<typeof DigestEditionsResponseSchema>;
export type DigestEdition = z.infer<typeof DigestEditionSchema>;
