/**
 * One-shot script: ingest all existing feeds/*.md into the server.
 *
 * Usage:
 *   set -a && source .env && set +a && bun run scripts/ingest-feeds.ts
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { resolve, join } from "path";
import matter from "gray-matter";
import { dedupHash } from "../packages/ingestion-worker/src/dedup";
import type { EntryCreate } from "../packages/contract/src/types";

const SERVER_URL = process.env.DAK_SERVER_URL ?? "http://localhost:3000";
const API_KEY = process.env.DAK_API_KEY ?? "";
const FEEDS_DIR = resolve(import.meta.dir, "..", "feeds");
const BATCH_SIZE = 500;

if (!API_KEY) {
  console.error("❌ DAK_API_KEY is required");
  process.exit(1);
}

function collectFiles(dir: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      files.push(...collectFiles(full));
    } else if (name.endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

function parseEntry(filePath: string): EntryCreate | null {
  try {
    const raw = readFileSync(filePath, "utf-8");
    const { data: fm, content } = matter(raw);

    const guid = String(fm.guid ?? fm.link ?? "");
    const title = String(fm.title ?? "");
    if (!title) return null;

    const id = fm.hash ?? dedupHash(guid, title);
    const published = fm.published
      ? new Date(fm.published).toISOString()
      : new Date().toISOString();

    return {
      id,
      title,
      content: content.trim() || null,
      url: fm.link ?? null,
      source: fm.source ?? "unknown",
      category: fm.category ?? "uncategorized",
      tags: Array.isArray(fm.tags) ? fm.tags : [],
      author: fm.author || null,
      language: fm.language || "en",
      published,
    };
  } catch {
    return null;
  }
}

async function uploadBatch(entries: EntryCreate[]): Promise<{ inserted: number; duplicates: number }> {
  const res = await fetch(`${SERVER_URL}/api/entries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ entries }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Upload failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<{ inserted: number; duplicates: number }>;
}

async function main() {
  console.log("📂 Scanning feeds/ ...");
  const files = collectFiles(FEEDS_DIR);
  console.log(`📄 ${files.length} markdown files found`);

  const entries: EntryCreate[] = [];
  let skipped = 0;

  for (const f of files) {
    const entry = parseEntry(f);
    if (entry) {
      entries.push(entry);
    } else {
      skipped++;
    }
  }

  console.log(`📦 ${entries.length} entries parsed, ${skipped} skipped`);

  let totalInserted = 0;
  let totalDuplicates = 0;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const result = await uploadBatch(batch);
    totalInserted += result.inserted;
    totalDuplicates += result.duplicates;
    console.log(
      `  ✓ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.inserted} inserted, ${result.duplicates} duplicates`
    );
  }

  console.log(
    `\n✅ Done: ${totalInserted} inserted, ${totalDuplicates} duplicates`
  );
}

main().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
