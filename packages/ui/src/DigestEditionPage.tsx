import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DigestEdition, DigestLang } from "@dak/contract";
import { api, ApiError } from "./api";
import { handleLinkClick } from "./router";

/** Parse /digest/:date/:lang from the current path. */
function parsePath(): { date: string; lang: DigestLang } | null {
  const parts = window.location.pathname.split("/").filter(Boolean); // ["digest", date, lang]
  if (parts.length < 3 || parts[0] !== "digest") return null;
  const date = parts[1];
  const lang = parts[2];
  if (lang !== "en" && lang !== "zh") return null;
  return { date, lang };
}

export function DigestEditionPage() {
  const { t } = useTranslation();
  const [edition, setEdition] = useState<DigestEdition | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "notfound">("loading");

  useEffect(() => {
    const parsed = parsePath();
    if (!parsed) {
      setStatus("notfound");
      return;
    }
    api
      .getDigestEdition(parsed.date, parsed.lang)
      .then((e) => {
        setEdition(e);
        setStatus("ok");
        document.title = `${e.title} · 大案牍库`;
      })
      .catch((err) => {
        setStatus(err instanceof ApiError && err.status === 404 ? "notfound" : "notfound");
      });
  }, []);

  return (
    <div className="bg-surface min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-14">
        <a
          href="/digest"
          onClick={handleLinkClick}
          className="inline-block mb-8 text-on-surface-variant hover:text-secondary transition-colors"
          style={{
            fontFamily: "var(--font-label)",
            fontSize: "0.75rem",
            letterSpacing: "0.08em",
          }}
        >
          ← {t("digest.backToArchive")}
        </a>

        {status === "loading" && (
          <p className="text-on-surface-variant" style={{ fontFamily: "var(--font-body)" }}>
            {t("digest.loading")}
          </p>
        )}

        {status === "notfound" && (
          <p className="text-on-surface-variant" style={{ fontFamily: "var(--font-body)" }}>
            {t("digest.notFound")}
          </p>
        )}

        {status === "ok" && edition && (
          <article>
            <div
              className="text-center pb-4 mb-6"
              style={{ borderTop: "3px double #041926", borderBottom: "3px double #041926", paddingTop: "1rem" }}
            >
              <div
                className="uppercase"
                style={{
                  fontFamily: "var(--font-label)",
                  fontSize: "0.7rem",
                  letterSpacing: "0.14em",
                  color: "#4e6073",
                }}
              >
                {edition.date} · {edition.lang === "zh" ? "中文版" : "English"}
              </div>
              <h1
                className="text-on-surface mt-3"
                style={{ fontFamily: "var(--font-display)", fontSize: "2.1rem", fontWeight: 700, lineHeight: 1.2 }}
              >
                {edition.title}
              </h1>
            </div>
            {/* Server-rendered, sanitized newspaper HTML (built from structured
                sections; only http(s) links are emitted). */}
            <div dangerouslySetInnerHTML={{ __html: edition.html }} />
          </article>
        )}
      </div>
    </div>
  );
}
