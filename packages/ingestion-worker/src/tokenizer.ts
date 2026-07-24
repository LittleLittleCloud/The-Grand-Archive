import init, { cut_for_search, initSync } from "jieba-wasm/web";
// wrangler bundles *.wasm as a WebAssembly.Module
import wasm from "./jieba.wasm";

let ready = false;

/** Instantiate the jieba wasm module once per isolate (synchronous, no fetch/fs). */
function ensureReady(): void {
  if (!ready) {
    initSync({ module: wasm as unknown as WebAssembly.Module });
    ready = true;
  }
}

/**
 * Tokenize text using jieba cutForSearch (fine-grained, good for search recall).
 * Filters out whitespace-only and single-punctuation tokens.
 * Returns space-joined token string suitable for FTS5 indexing.
 */
export function tokenize(text: string): string {
  ensureReady();
  const tokens = cut_for_search(text, true);
  return tokens
    .filter((t) => t.trim().length > 0 && !/^[\p{P}\p{S}]$/u.test(t))
    .join(" ");
}

// Exported for optional async warmup.
export const warmup = init;
