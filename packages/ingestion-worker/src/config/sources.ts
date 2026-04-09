import { readFileSync } from "fs";
import { resolve } from "path";
import { parse as parseYaml } from "yaml";
import type { SourceConfig } from "../fetcher";

const ROOT = process.env.CONFIG_DIR
  ? resolve(process.env.CONFIG_DIR)
  : resolve(import.meta.dir, "..", "..", "..", "..");
const RSSHUB_PLACEHOLDER = "{{RSSHUB_BASE_URL}}";
const DEFAULT_RSSHUB_BASE = "http://localhost:1200";
const RSSHUB_BASE_URL = (() => {
  const env = process.env.RSSHUB_BASE_URL?.trim();
  const base = env && env.length > 0 ? env : DEFAULT_RSSHUB_BASE;
  return base.replace(/\/+$/, "");
})();

interface RawSource {
  name: string;
  url: string;
  category: string;
  enabled: boolean;
  tags: string[];
}

function resolveRequestUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("/")) {
    return `${RSSHUB_BASE_URL}${url}`;
  }
  if (url.includes(RSSHUB_PLACEHOLDER)) {
    return url.split(RSSHUB_PLACEHOLDER).join(RSSHUB_BASE_URL);
  }
  return url;
}

export function loadSources(): SourceConfig[] {
  const raw = readFileSync(
    resolve(ROOT, "config/sources.yaml"),
    "utf-8"
  );
  const config = parseYaml(raw) as { sources: RawSource[] };
  return config.sources
    .filter((s) => s.enabled)
    .map((source) => ({
      name: source.name,
      url: source.url,
      requestUrl: resolveRequestUrl(source.url),
      category: source.category,
      tags: source.tags ?? [],
    }));
}
