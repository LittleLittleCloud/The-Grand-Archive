import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { UserDigest } from "@dak/contract";
import { api, ApiError } from "./api";
import { handleLinkClick } from "./router";
import { ShareBar } from "./ShareBar";
import { GenerateDigestCard } from "./GenerateDigestCard";

/** Parse /d/:shareId from the current path. */
function parseShareId(): string | null {
  const parts = window.location.pathname.split("/").filter(Boolean); // ["d", shareId]
  if (parts.length < 2 || parts[0] !== "d") return null;
  return parts[1];
}

/**
 * Public, link-only view of a user-published digest. Anyone with the shareId
 * can read it; the page carries a 大案牍库 promotional banner.
 */
export function UserDigestPage() {
  const { t } = useTranslation();
  const [digest, setDigest] = useState<UserDigest | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "notfound">("loading");

  useEffect(() => {
    const shareId = parseShareId();
    if (!shareId) {
      setStatus("notfound");
      return;
    }
    api
      .getPublicUserDigest(shareId)
      .then((d) => {
        setDigest(d);
        setStatus("ok");
        document.title = `${d.title} · 大案牍库`;
      })
      .catch((err) => {
        setStatus(err instanceof ApiError && err.status === 404 ? "notfound" : "notfound");
      });
  }, []);

  return (
    <div className="bg-surface min-h-screen">
      {/* Top promo strip */}
      <DakBanner variant="strip" />

      <div className="max-w-2xl mx-auto px-6 py-12">
        {status === "loading" && (
          <p className="text-on-surface-variant" style={{ fontFamily: "var(--font-body)" }}>
            {t("userDigest.loading")}
          </p>
        )}

        {status === "notfound" && (
          <p className="text-on-surface-variant" style={{ fontFamily: "var(--font-body)" }}>
            {t("userDigest.unavailable")}
          </p>
        )}

        {status === "ok" && digest && (
          <>
            <article>
              <div
                className="text-center pb-4 mb-6"
                style={{
                  borderTop: "3px double #041926",
                  borderBottom: "3px double #041926",
                  paddingTop: "1rem",
                }}
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
                  {digest.date} · {digest.lang === "zh" ? "中文版" : "English"}
                </div>
                <h1
                  className="text-on-surface mt-3"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "2.1rem",
                    fontWeight: 700,
                    lineHeight: 1.2,
                  }}
                >
                  {digest.title}
                </h1>
              </div>
              <ShareBar url={window.location.href} title={digest.title} />
              {/* Server-rendered, escaped newspaper HTML (only http(s) links emitted). */}
              <div dangerouslySetInnerHTML={{ __html: digest.html }} />
            </article>

            {/* "Publish your own" instruction card — drives organic propagation. */}
            <GenerateDigestCard />

            {/* Bottom call-to-action banner */}
            <DakBanner variant="cta" />
          </>
        )}
      </div>
    </div>
  );
}

/** 大案牍库 advertisement / attribution banner. */
function DakBanner({ variant }: { variant: "strip" | "cta" }) {
  const { t } = useTranslation();
  if (variant === "strip") {
    return (
      <a
        href="/"
        onClick={handleLinkClick}
        className="block text-center py-2 px-4 hover:opacity-90 transition-opacity"
        style={{ background: "#041926", color: "#b8860b" }}
      >
        <span
          style={{
            fontFamily: "var(--font-label)",
            fontSize: "0.72rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {t("userDigest.bannerStrip")}
        </span>
      </a>
    );
  }

  return (
    <div
      className="mt-12 text-center px-6 py-8"
      style={{ border: "2px solid #041926", background: "#f3efe4" }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.4rem",
          fontWeight: 700,
          color: "#041926",
        }}
      >
        {t("userDigest.bannerBrand")}
      </div>
      <p
        className="mt-2"
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.95rem",
          color: "#4e6073",
          lineHeight: 1.6,
        }}
      >
        {t("userDigest.bannerDesc")}
      </p>
      <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
        <a
          href="/"
          onClick={handleLinkClick}
          className="inline-block px-5 py-2"
          style={{
            background: "#041926",
            color: "#fff",
            fontFamily: "var(--font-label)",
            fontSize: "0.8rem",
            letterSpacing: "0.05em",
          }}
        >
          {t("userDigest.explore")}
        </a>
        <a
          href="/digest"
          onClick={handleLinkClick}
          className="inline-block px-5 py-2"
          style={{
            border: "1px solid #041926",
            color: "#041926",
            fontFamily: "var(--font-label)",
            fontSize: "0.8rem",
            letterSpacing: "0.05em",
          }}
        >
          {t("userDigest.readDaily")}
        </a>
      </div>
    </div>
  );
}
