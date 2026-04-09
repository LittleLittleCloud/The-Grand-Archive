import { createHash } from "crypto";

/** Generate a content hash for deduplication. Uses MD5 of guid+title, takes first 12 chars. */
export function dedupHash(guid: string, title: string): string {
  return createHash("md5")
    .update(`${guid}${title}`)
    .digest("hex")
    .slice(0, 12);
}
