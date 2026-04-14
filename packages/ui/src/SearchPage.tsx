import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "./api";
import type { SearchResponse, SearchResult } from "@dak/contract";

const CATEGORIES = [
  "finance",
  "news",
  "tech",
  "social",
  "blog",
  "podcast",
  "uncategorized",
] as const;

type SortKey = "relevance" | "date-desc" | "date-asc" | "title";

function sortResults(results: SearchResult[], key: SortKey): SearchResult[] {
  const sorted = [...results];
  switch (key) {
    case "relevance":
      return sorted.sort((a, b) => b.score - a.score);
    case "date-desc":
      return sorted.sort(
        (a, b) =>
          new Date(b.published).getTime() - new Date(a.published).getTime()
      );
    case "date-asc":
      return sorted.sort(
        (a, b) =>
          new Date(a.published).getTime() - new Date(b.published).getTime()
      );
    case "title":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return sorted;
  }
}

export function SearchPage() {
  const { t } = useTranslation();

  // Search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Advanced filters
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [category, setCategory] = useState("");
  const [source, setSource] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>("relevance");

  // Pagination
  const [offset, setOffset] = useState(0);
  const limit = 20;

  async function handleSearch(e: React.FormEvent, newOffset = 0) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setOffset(newOffset);
    try {
      const data = await api.search({
        q: query,
        category: category || undefined,
        source: source || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        limit,
        offset: newOffset,
      });
      setResults(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setCategory("");
    setSource("");
    setDateFrom("");
    setDateTo("");
  }

  const sorted = results ? sortResults(results.results, sortKey) : [];
  const hasPrev = offset > 0;
  const hasNext = results ? offset + limit < results.total : false;

  return (
    <div className="min-h-screen bg-surface pt-14">
      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.placeholder")}
            className="flex-1 px-0 py-2 bg-transparent text-on-surface placeholder-on-surface-variant/50 focus:outline-none"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "1rem",
              borderBottom: "1px solid rgba(115,119,124,0.3)",
            }}
            onFocus={(e) =>
              (e.target.style.borderBottom = "2px solid #041926")
            }
            onBlur={(e) =>
              (e.target.style.borderBottom =
                "1px solid rgba(115,119,124,0.3)")
            }
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary text-on-primary font-medium hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
            style={{
              fontFamily: "var(--font-label)",
              letterSpacing: "0.05em",
              fontSize: "0.85rem",
            }}
          >
            {loading ? "..." : t("search.button")}
          </button>
        </form>

        {/* Advanced toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="mb-4 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          style={{
            fontFamily: "var(--font-label)",
            fontSize: "0.75rem",
            letterSpacing: "0.05em",
          }}
        >
          {showAdvanced
            ? `▾ ${t("search.hideAdvanced")}`
            : `▸ ${t("search.showAdvanced")}`}
        </button>

        {/* Advanced filters */}
        {showAdvanced && (
          <div
            className="mb-8 p-5 bg-surface-low grid grid-cols-1 sm:grid-cols-2 gap-4"
            style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem" }}
          >
            {/* Category */}
            <div>
              <label className="block text-on-surface-variant mb-1 text-xs uppercase tracking-wider">
                {t("search.category")}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-outline/30 text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="">{t("search.allCategories")}</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Source */}
            <div>
              <label className="block text-on-surface-variant mb-1 text-xs uppercase tracking-wider">
                {t("search.source")}
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder={t("search.sourcePlaceholder")}
                className="w-full px-3 py-2 bg-surface border border-outline/30 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary"
              />
            </div>

            {/* Date from */}
            <div>
              <label className="block text-on-surface-variant mb-1 text-xs uppercase tracking-wider">
                {t("search.from")}
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-outline/30 text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            {/* Date to */}
            <div>
              <label className="block text-on-surface-variant mb-1 text-xs uppercase tracking-wider">
                {t("search.to")}
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-outline/30 text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            {/* Clear filters */}
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="button"
                onClick={handleClear}
                className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                style={{
                  fontFamily: "var(--font-label)",
                  fontSize: "0.75rem",
                  letterSpacing: "0.05em",
                }}
              >
                {t("search.clearFilters")}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-surface-low text-on-surface">
            {error}
          </div>
        )}

        {/* Results */}
        {results && (
          <div>
            {/* Results header: count + sort */}
            <div className="flex items-center justify-between mb-6">
              <p
                className="text-on-surface-variant"
                style={{
                  fontFamily: "var(--font-label)",
                  fontSize: "0.75rem",
                  letterSpacing: "0.05em",
                }}
              >
                {results.total} {t("search.resultsFor")} &ldquo;{results.query}
                &rdquo;
              </p>
              <div className="flex items-center gap-2">
                <label
                  className="text-on-surface-variant"
                  style={{
                    fontFamily: "var(--font-label)",
                    fontSize: "0.75rem",
                    letterSpacing: "0.05em",
                  }}
                >
                  {t("search.sortBy")}
                </label>
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="px-2 py-1 bg-surface border border-outline/30 text-on-surface text-xs focus:outline-none focus:border-primary"
                  style={{ fontFamily: "var(--font-label)" }}
                >
                  <option value="relevance">{t("search.sortRelevance")}</option>
                  <option value="date-desc">{t("search.sortNewest")}</option>
                  <option value="date-asc">{t("search.sortOldest")}</option>
                  <option value="title">{t("search.sortTitle")}</option>
                </select>
              </div>
            </div>

            {/* Tier cutoff notice */}
            {results.tierCutoff && (
              <div
                className="mb-4 px-4 py-2 bg-surface-low text-on-surface-variant"
                style={{
                  fontFamily: "var(--font-label)",
                  fontSize: "0.75rem",
                  letterSpacing: "0.03em",
                }}
              >
                {t("search.tierNotice", {
                  tier: results.tier,
                  date: results.tierCutoff.slice(0, 10),
                })}
              </div>
            )}

            {/* Result list */}
            <ul className="space-y-0">
              {sorted.map((r, i) => (
                <li
                  key={r.id}
                  className="py-5 px-6 transition-colors hover:bg-surface-low cursor-pointer"
                  style={{
                    background:
                      i % 2 === 0
                        ? "var(--color-surface)"
                        : "var(--color-surface-container-low)",
                  }}
                  onClick={() => {
                    window.location.hash = `#/entry/${encodeURIComponent(r.id)}`;
                  }}
                >
                  <h3
                    className="text-on-surface"
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "1rem",
                      fontWeight: 500,
                    }}
                  >
                    {r.title}
                  </h3>
                  <div
                    className="mt-2 flex flex-wrap gap-4 text-on-surface-variant"
                    style={{
                      fontFamily: "var(--font-label)",
                      fontSize: "0.75rem",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <span className="px-2 py-0.5 bg-surface-high">
                      {r.category}
                    </span>
                    <span>{r.source}</span>
                    <span>{r.published.slice(0, 10)}</span>
                    <span style={{ color: "var(--color-outline)" }}>
                      score: {r.score.toFixed(1)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            {/* Pagination */}
            {(hasPrev || hasNext) && (
              <div className="flex justify-center gap-4 mt-8">
                <button
                  disabled={!hasPrev}
                  onClick={(e) => handleSearch(e, offset - limit)}
                  className="px-4 py-2 text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-opacity cursor-pointer disabled:cursor-default"
                  style={{
                    fontFamily: "var(--font-label)",
                    fontSize: "0.8rem",
                    letterSpacing: "0.05em",
                  }}
                >
                  ← {t("search.prev")}
                </button>
                <span
                  className="px-4 py-2 text-on-surface-variant"
                  style={{
                    fontFamily: "var(--font-label)",
                    fontSize: "0.8rem",
                  }}
                >
                  {Math.floor(offset / limit) + 1} /{" "}
                  {Math.ceil(results.total / limit)}
                </span>
                <button
                  disabled={!hasNext}
                  onClick={(e) => handleSearch(e, offset + limit)}
                  className="px-4 py-2 text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-opacity cursor-pointer disabled:cursor-default"
                  style={{
                    fontFamily: "var(--font-label)",
                    fontSize: "0.8rem",
                    letterSpacing: "0.05em",
                  }}
                >
                  {t("search.next")} →
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
