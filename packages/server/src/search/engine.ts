export type { IndexedEntry, SearchOptions, SearchOutput } from "./interface";
export {
  searchFts as search,
  addToFtsIndex as addToIndex,
  rebuildFtsIndex as buildSearchIndex,
} from "./fts5";
