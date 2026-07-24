import RSSParser from "rss-parser";
import type { EntryCreate } from "@dak/contract";
import { parseContent } from "./parser";
import { dedupHash } from "./dedup";

/** Normalize any date string (RFC-822 or ISO 8601) to ISO 8601 format. */
export function normalizeDate(raw: string): string {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

const parser = new RSSParser({
  headers: { "User-Agent": "DaAnDuKu-Ingestion/2.0" },
});

const FETCH_TIMEOUT_MS = 30_000;

export interface SourceConfig {
  name: string;
  url: string;
  requestUrl: string;
  category: string;
  tags: string[];
}

export async function fetchAllSources(
  sources: SourceConfig[]
): Promise<EntryCreate[]> {
  const allEntries: EntryCreate[] = [];

  for (const source of sources) {
    try {
      const entries = await fetchSource(source);
      allEntries.push(...entries);
      console.log(`  ✓ ${source.name}: ${entries.length} entries`);
    } catch (err) {
      console.error(`  ✗ ${source.name}: ${(err as Error).message}`);
    }
  }

  return allEntries;
}

async function fetchSource(source: SourceConfig): Promise<EntryCreate[]> {
  // Fetch the feed with the platform fetch (Workers has no Node http client),
  // then parse the XML string with rss-parser.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let xml: string;
  try {
    const res = await fetch(source.requestUrl, {
      headers: { "User-Agent": "DaAnDuKu-Ingestion/2.0" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    xml = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const feed = await parser.parseString(xml);
  const entries: EntryCreate[] = [];

  for (const item of feed.items) {
    const title = item.title || "无标题";
    const link = item.link || "";
    const guid = item.guid || item.id || link;
    const rawContent =
      (item as Record<string, string>)["content:encoded"] ||
      item.content ||
      item.contentSnippet ||
      (item as Record<string, string>).summary ||
      "";

    const id = dedupHash(guid, title);
    const content = parseContent(rawContent);
    const publishedRaw = item.isoDate || item.pubDate || new Date().toISOString();
    const published = normalizeDate(publishedRaw);

    entries.push({
      id,
      title,
      content,
      url: link || null,
      source: source.name,
      category: source.category as EntryCreate["category"],
      tags: [...source.tags],
      author: item.creator || (item as Record<string, string>).author || null,
      language: "en",
      published,
    });
  }

  return entries;
}
