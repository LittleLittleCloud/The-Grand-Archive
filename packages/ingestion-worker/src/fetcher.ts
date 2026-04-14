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
  timeout: 30_000,
  headers: { "User-Agent": "DaAnDuKu-Ingestion/2.0" },
});

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
      console.error(
        `  ✗ ${source.name}: ${(err as Error).message}`
      );
    }
  }

  return allEntries;
}

async function fetchSource(source: SourceConfig): Promise<EntryCreate[]> {
  const feed = await parser.parseURL(source.requestUrl);
  const entries: EntryCreate[] = [];

  for (const item of feed.items) {
    const title = item.title || "无标题";
    const link = item.link || "";
    const guid = item.guid || item.id || link;
    const rawContent =
      item["content:encoded"] ||
      item.content ||
      item.contentSnippet ||
      item.summary ||
      "";

    const id = dedupHash(guid, title);
    const content = parseContent(rawContent);
    const publishedRaw =
      item.isoDate || item.pubDate || new Date().toISOString();
    const published = normalizeDate(publishedRaw);

    entries.push({
      id,
      title,
      content,
      url: link || null,
      source: source.name,
      category: source.category as EntryCreate["category"],
      tags: [...source.tags],
      author: item.creator || item.author || null,
      language: "en",
      published,
    });
  }

  return entries;
}
