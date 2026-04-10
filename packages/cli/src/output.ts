import type { SearchResult, Entry, StatsResponse } from "@littlelittlecloud/dak";

export function formatTable(results: SearchResult[]): string {
  if (results.length === 0) return "No results found.";

  const lines = results.map((r, i) => {
    const idx = String(i + 1).padStart(3);
    const score = r.score.toFixed(1).padStart(5);
    const date = r.published.slice(0, 10);
    const cat = r.category.padEnd(10);
    return `${idx}. [${score}] ${date}  ${cat}  ${r.title}`;
  });

  return lines.join("\n");
}

export function formatEntries(entries: Entry[]): string {
  if (entries.length === 0) return "No entries found.";

  const lines = entries.map((e, i) => {
    const idx = String(i + 1).padStart(3);
    const date = e.published.slice(0, 10);
    const cat = e.category.padEnd(10);
    return `${idx}. ${date}  ${cat}  ${e.title}`;
  });

  return lines.join("\n");
}

export function formatStats(stats: StatsResponse): string {
  const lines: string[] = [];
  lines.push(`Total entries: ${stats.total}`);
  lines.push("");
  lines.push("By category:");
  for (const c of stats.byCategory) {
    lines.push(`  ${c.category.padEnd(15)} ${c.count}`);
  }
  lines.push("");
  lines.push("By source:");
  for (const s of stats.bySource.slice(0, 20)) {
    lines.push(`  ${s.source.padEnd(30)} ${s.count}`);
  }
  if (stats.bySource.length > 20) {
    lines.push(`  ... and ${stats.bySource.length - 20} more`);
  }
  return lines.join("\n");
}

export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
