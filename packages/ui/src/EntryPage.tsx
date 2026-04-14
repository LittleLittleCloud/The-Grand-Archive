import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "./api";
import type { Entry } from "@dak/contract";

function extractEntryId(): string | null {
  const hash = window.location.hash;
  const match = hash.match(/^#\/entry\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function EntryPage() {
  const { t } = useTranslation();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = extractEntryId();
    if (!id) {
      setError("No entry ID provided");
      setLoading(false);
      return;
    }
    api
      .getFeed(id)
      .then(setEntry)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface pt-14">
        <main className="max-w-3xl mx-auto px-6 py-10">
          <p className="text-on-surface-variant">{t("entry.loading")}</p>
        </main>
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="min-h-screen bg-surface pt-14">
        <main className="max-w-3xl mx-auto px-6 py-10">
          <p className="text-on-surface mb-4">{error ?? "Entry not found"}</p>
          <button
            onClick={() => window.history.back()}
            className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "0.8rem",
              letterSpacing: "0.05em",
            }}
          >
            ← {t("entry.back")}
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pt-14">
      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Back link */}
        <button
          onClick={() => window.history.back()}
          className="mb-8 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          style={{
            fontFamily: "var(--font-label)",
            fontSize: "0.8rem",
            letterSpacing: "0.05em",
          }}
        >
          ← {t("entry.back")}
        </button>

        {/* Title */}
        <h1
          className="text-on-surface mb-4"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.75rem",
            fontWeight: 500,
            lineHeight: 1.3,
          }}
        >
          {entry.title}
        </h1>

        {/* Metadata */}
        <div
          className="flex flex-wrap gap-4 mb-8 text-on-surface-variant"
          style={{
            fontFamily: "var(--font-label)",
            fontSize: "0.75rem",
            letterSpacing: "0.05em",
          }}
        >
          <span className="px-2 py-0.5 bg-surface-low">
            {entry.category}
          </span>
          <span>{entry.source}</span>
          {entry.author && <span>{entry.author}</span>}
          <span>{entry.published.slice(0, 10)}</span>
          {entry.language && (
            <span style={{ color: "var(--color-outline)" }}>
              {entry.language.toUpperCase()}
            </span>
          )}
        </div>

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-on-surface-variant bg-surface-high"
                style={{
                  fontFamily: "var(--font-label)",
                  fontSize: "0.7rem",
                  letterSpacing: "0.05em",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        {entry.content ? (
          <div
            className="text-on-surface leading-relaxed whitespace-pre-wrap"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.95rem",
              lineHeight: 1.8,
            }}
          >
            {entry.content}
          </div>
        ) : (
          <p
            className="text-on-surface-variant italic"
            style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem" }}
          >
            {t("entry.noContent")}
          </p>
        )}

        {/* External link */}
        {entry.url && (
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-8 px-5 py-2 bg-primary text-on-primary font-medium hover:opacity-90 transition-opacity"
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "0.8rem",
              letterSpacing: "0.05em",
            }}
          >
            {t("entry.viewOriginal")} ↗
          </a>
        )}
      </main>
    </div>
  );
}
