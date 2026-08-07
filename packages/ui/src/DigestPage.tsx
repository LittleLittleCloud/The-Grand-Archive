import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DigestEditionSummary, DigestLang } from "@dak/contract";
import { api } from "./api";
import { handleLinkClick } from "./router";
import { DigestSubscribe } from "./DigestSubscribe";

function useQueryFlag(name: string): string | null {
  const [value] = useState(() => new URLSearchParams(window.location.search).get(name));
  return value;
}

export function DigestPage() {
  const { t, i18n } = useTranslation();
  const lang: DigestLang = i18n.language.startsWith("zh") ? "zh" : "en";
  const [editions, setEditions] = useState<DigestEditionSummary[] | null>(null);
  const confirmed = useQueryFlag("confirmed");
  const unsubscribed = useQueryFlag("unsubscribed");
  const error = useQueryFlag("error");

  useEffect(() => {
    setEditions(null);
    api
      .getDigestEditions(lang)
      .then((r) => setEditions(r.editions))
      .catch(() => setEditions([]));
  }, [lang]);

  const banner = confirmed
    ? { text: t("digest.confirmedBanner"), tone: "ok" as const }
    : unsubscribed
      ? { text: t("digest.unsubscribedBanner"), tone: "ok" as const }
      : error
        ? { text: t("digest.errorBanner"), tone: "err" as const }
        : null;

  return (
    <div className="bg-surface min-h-screen">
      <DigestSubscribe />

      <div className="max-w-3xl mx-auto px-6 py-14">
        {banner && (
          <div
            className="mb-8 px-5 py-4"
            style={{
              fontFamily: "var(--font-body)",
              background: banner.tone === "ok" ? "#eef3ec" : "#f6ecec",
              color: banner.tone === "ok" ? "#2f5233" : "#7a2e2e",
            }}
          >
            {banner.text}
          </div>
        )}

        <h1
          className="text-on-surface mb-2"
          style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700 }}
        >
          {t("digest.archiveTitle")}
        </h1>
        <p
          className="text-on-surface-variant mb-10"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {t("digest.archiveSubtitle")}
        </p>

        {editions === null ? (
          <p style={{ fontFamily: "var(--font-body)" }} className="text-on-surface-variant">
            {t("digest.loading")}
          </p>
        ) : editions.length === 0 ? (
          <p style={{ fontFamily: "var(--font-body)" }} className="text-on-surface-variant">
            {t("digest.empty")}
          </p>
        ) : (
          <ul>
            {editions.map((ed) => (
              <li
                key={`${ed.date}-${ed.lang}`}
                className="py-5"
                style={{ borderTop: "1px solid rgba(115,119,124,0.15)" }}
              >
                <a
                  href={`/digest/${ed.date}/${ed.lang}`}
                  onClick={handleLinkClick}
                  className="block group"
                >
                  <div className="flex items-baseline gap-4">
                    <span
                      className="shrink-0 text-on-surface-variant"
                      style={{
                        fontFamily: "var(--font-label)",
                        fontSize: "0.72rem",
                        letterSpacing: "0.08em",
                        width: "6.5rem",
                      }}
                    >
                      {ed.date}
                    </span>
                    <span className="flex-1">
                      <span
                        className="text-on-surface group-hover:text-secondary transition-colors"
                        style={{ fontFamily: "var(--font-headline)", fontSize: "1.25rem", fontWeight: 600 }}
                      >
                        {ed.title}
                      </span>
                      {ed.summary && (
                        <span
                          className="block mt-1 text-on-surface-variant"
                          style={{ fontFamily: "var(--font-body)", fontSize: "0.95rem" }}
                        >
                          {ed.summary}
                        </span>
                      )}
                    </span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
