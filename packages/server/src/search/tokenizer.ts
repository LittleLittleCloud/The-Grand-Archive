import { Jieba } from "@node-rs/jieba";
import { dict } from "@node-rs/jieba/dict";

const jieba = Jieba.withDict(dict);

/**
 * Tokenize text using jieba cutForSearch (fine-grained, good for search recall).
 * Filters out whitespace-only and single-punctuation tokens.
 * Returns space-joined token string suitable for FTS5 indexing.
 */
export function tokenize(text: string): string {
  const tokens = jieba.cutForSearch(text, true);
  return tokens
    .filter((t) => t.trim().length > 0 && !/^[\p{P}\p{S}]$/u.test(t))
    .join(" ");
}
