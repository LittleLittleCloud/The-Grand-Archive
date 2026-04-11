export type { SearchEngine, IndexedEntry, SearchOptions, SearchOutput } from "./interface";
import type { SearchEngine } from "./interface";
import { Fts5SearchEngine } from "./fts5";
import { MiniSearchEngine } from "./minisearch";

let engine: SearchEngine;

function createEngine(): SearchEngine {
  const backend = process.env.SEARCH_ENGINE ?? "fts5";
  switch (backend) {
    case "minisearch":
      return new MiniSearchEngine();
    case "fts5":
      return new Fts5SearchEngine();
    default:
      console.warn(`Unknown SEARCH_ENGINE="${backend}", falling back to fts5`);
      return new Fts5SearchEngine();
  }
}

export function getSearchEngine(): SearchEngine {
  if (!engine) {
    engine = createEngine();
  }
  return engine;
}

export async function buildSearchIndex(): Promise<void> {
  const e = getSearchEngine();
  await e.init();
}

export function addToIndex(
  entries: import("./interface").IndexedEntry[]
): void {
  getSearchEngine().add(entries);
}

export function search(
  query: string,
  options?: import("./interface").SearchOptions
): import("./interface").SearchOutput {
  return getSearchEngine().search(query, options);
}
