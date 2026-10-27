import { describe, expect, it } from "bun:test";
import { fetchAllSources, normalizeDate } from "./fetcher";

describe("normalizeDate", () => {
  it("converts RFC-822 date to ISO 8601", () => {
    const result = normalizeDate("Wed, 08 Apr 2026 16:40:10 GMT");
    expect(result).toBe("2026-04-08T16:40:10.000Z");
  });

  it("keeps ISO 8601 date as-is", () => {
    const result = normalizeDate("2026-04-09T13:13:15.000Z");
    expect(result).toBe("2026-04-09T13:13:15.000Z");
  });

  it("converts RFC-822 with different day names", () => {
    expect(normalizeDate("Mon, 13 Apr 2026 07:08:45 GMT")).toBe("2026-04-13T07:08:45.000Z");
    expect(normalizeDate("Fri, 10 Apr 2026 15:48:09 GMT")).toBe("2026-04-10T15:48:09.000Z");
    expect(normalizeDate("Tue, 31 Mar 2026 18:35:23 GMT")).toBe("2026-03-31T18:35:23.000Z");
  });

  it("handles ISO 8601 without milliseconds", () => {
    const result = normalizeDate("2026-04-09T14:38:23Z");
    expect(result).toBe("2026-04-09T14:38:23.000Z");
  });

  it("falls back to current time for invalid input", () => {
    const before = Date.now();
    const result = normalizeDate("not-a-date");
    const after = Date.now();
    const ts = new Date(result).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

describe("fetchAllSources", () => {
  it("uses a configured source language", async () => {
    const entries = await fetchAllSources(
      [{
        name: "Joho no Todai",
        url: "https://joho-todai.com/pinterest-rss/",
        requestUrl: "https://joho-todai.com/pinterest-rss/",
        category: "tech",
        tags: [],
        language: "ja",
      }],
      async () =>
        new Response(
          `<rss version="2.0"><channel><title>Joho no Todai</title><item><title>半導体ニュース</title><link>https://joho-todai.com/article/</link><guid>https://joho-todai.com/article/</guid><description>記事の短い抜粋</description><pubDate>Mon, 12 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>`
        )
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].language).toBe("ja");
  });

  it("defaults unspecified source languages to English", async () => {
    const entries = await fetchAllSources(
      [{
        name: "Test source",
        url: "https://example.com/feed",
        requestUrl: "https://example.com/feed",
        category: "tech",
        tags: [],
      }],
      async () =>
        new Response(
          `<rss version="2.0"><channel><title>Test source</title><item><title>Test</title><link>https://example.com/article</link><guid>1</guid><description>Excerpt</description></item></channel></rss>`
        )
    );

    expect(entries[0].language).toBe("en");
  });
});
