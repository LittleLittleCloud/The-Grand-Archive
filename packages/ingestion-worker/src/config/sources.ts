import { parse as parseYaml } from "yaml";
// Bundled at build time via a wrangler Text rule (see wrangler.jsonc) so the
// worker has no filesystem dependency.
import sourcesYaml from "../../../../config/sources.yaml";
import type { SourceConfig } from "../fetcher";

const RSSHUB_PLACEHOLDER = "{{RSSHUB_BASE_URL}}";
const DEFAULT_RSSHUB_BASE = "http://localhost:1200";

interface RawSource {
  name: string;
  url: string;
  category: string;
  enabled: boolean;
  tags: string[];
}

function resolveRequestUrl(url: string, base: string): string {
  if (!url) return url;
  if (url.startsWith("/")) {
    return `${base}${url}`;
  }
  if (url.includes(RSSHUB_PLACEHOLDER)) {
    return url.split(RSSHUB_PLACEHOLDER).join(base);
  }
  return url;
}

export function loadSources(rsshubBaseUrl?: string): SourceConfig[] {
  const base = (rsshubBaseUrl?.trim() || DEFAULT_RSSHUB_BASE).replace(/\/+$/, "");
  const config = parseYaml(sourcesYaml as string) as { sources: RawSource[] };
  return config.sources
    .filter((s) => s.enabled)
    .map((source) => ({
      name: source.name,
      url: source.url,
      requestUrl: resolveRequestUrl(source.url, base),
      category: source.category,
      tags: source.tags ?? [],
    }));
}
