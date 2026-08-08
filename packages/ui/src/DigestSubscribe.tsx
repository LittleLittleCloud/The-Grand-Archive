import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DigestLang } from "@dak/contract";
import { api, ApiError } from "./api";
import { handleLinkClick } from "./router";

/**
 * Landing-page digest section — a two-slide sliding carousel that alternates
 * between subscribing to DAK Daily and publishing your own digest. Auto-advances
 * and can be switched manually via the dots. Both slides live in the same dark
 * section; the track slides horizontally (translateX) to switch.
 */
export function DigestSubscribe() {
  const [active, setActive] = useState(0);
  const SLIDES = 2;

  // Auto-advance; re-armed whenever `active` changes (so a manual switch resets
  // the timer instead of jumping immediately after).
  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % SLIDES), 7000);
    return () => clearInterval(id);
  }, [active]);

  return (
    <section style={{ background: "linear-gradient(135deg, #041926 0%, #1a2e3b 100%)" }}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${active * 100}%)` }}
          >
            <div className="shrink-0" style={{ minWidth: "100%" }}>
              <SubscribeSlide />
            </div>
            <div className="shrink-0" style={{ minWidth: "100%" }}>
              <PublishSlide />
            </div>
          </div>
        </div>

        {/* Slide indicators */}
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: SLIDES }).map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Slide ${i + 1}`}
              className="cursor-pointer transition-all"
              style={{
                width: active === i ? "22px" : "8px",
                height: "8px",
                background: active === i ? "#e9c176" : "rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Slide 1 — subscribe to the daily edition. */
function SubscribeSlide() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [lang, setLang] = useState<DigestLang>(i18n.language.startsWith("zh") ? "zh" : "en");
  const [state, setState] = useState<"idle" | "loading" | "done" | "active" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setState("loading");
    setMessage("");
    try {
      const res = await api.subscribeDigest(email.trim(), lang);
      setState(res.status === "active" ? "active" : "done");
      setMessage(res.message);
    } catch (err) {
      setState("error");
      setMessage(err instanceof ApiError ? err.message : t("digest.subscribeError"));
    }
  };

  const done = state === "done" || state === "active";

  return (
    <div className="text-center">
        <div
          className="uppercase text-gold mb-3"
          style={{ fontFamily: "var(--font-label)", fontSize: "0.7rem", letterSpacing: "0.28em" }}
        >
          {t("digest.kicker")}
        </div>
        <h2
          className="text-on-primary"
          style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700 }}
        >
          {t("digest.title")}
        </h2>
        <p
          className="mt-4 text-on-primary/70 max-w-xl mx-auto leading-relaxed"
          style={{ fontFamily: "var(--font-body)", fontSize: "1.02rem" }}
        >
          {t("digest.subtitle")}
        </p>

        {done ? (
          <p
            className="mt-8 text-on-primary"
            style={{ fontFamily: "var(--font-body)", fontSize: "1rem" }}
          >
            {message || t("digest.checkInbox")}
          </p>
        ) : (
          <form onSubmit={submit} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-stretch">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("digest.emailPlaceholder")}
              className="flex-1 max-w-sm px-4 py-3 text-on-surface"
              style={{ background: "#fcf9f2", fontFamily: "var(--font-body)", border: "none" }}
            />
            <div className="flex" style={{ background: "rgba(255,255,255,0.08)" }}>
              {(["en", "zh"] as DigestLang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className="px-4 py-3 transition-colors"
                  style={{
                    fontFamily: "var(--font-label)",
                    fontSize: "0.75rem",
                    letterSpacing: "0.08em",
                    background: lang === l ? "#e9c176" : "transparent",
                    color: lang === l ? "#041926" : "rgba(255,255,255,0.7)",
                  }}
                >
                  {l === "en" ? "EN" : "中文"}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={state === "loading"}
              className="px-6 py-3 font-semibold transition-colors disabled:opacity-60"
              style={{ fontFamily: "var(--font-body)", background: "#e9c176", color: "#041926" }}
            >
              {state === "loading" ? t("digest.subscribing") : t("digest.subscribe")}
            </button>
          </form>
        )}

        {state === "error" && (
          <p className="mt-4 text-sm" style={{ color: "#e9a3a3", fontFamily: "var(--font-body)" }}>
            {message}
          </p>
        )}

        <div className="mt-6">
          <a
            href="/digest"
            onClick={handleLinkClick}
            className="text-on-primary/70 hover:text-on-primary transition-colors"
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "0.8rem",
              letterSpacing: "0.06em",
              textDecoration: "underline",
              textUnderlineOffset: "4px",
            }}
          >
            {t("digest.browseArchive")}
          </a>
        </div>
    </div>
  );
}

/** Slide 2 — publish your own digest (My Digests feature). */
function PublishSlide() {
  const { t } = useTranslation();
  return (
    <div className="text-center">
      <div
        className="uppercase text-gold mb-3"
        style={{ fontFamily: "var(--font-label)", fontSize: "0.7rem", letterSpacing: "0.28em" }}
      >
        {t("digest.publishKicker")}
      </div>
      <h2
        className="text-on-primary"
        style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700 }}
      >
        {t("digest.publishTitle")}
      </h2>
      <p
        className="mt-4 text-on-primary/70 max-w-xl mx-auto leading-relaxed"
        style={{ fontFamily: "var(--font-body)", fontSize: "1.02rem" }}
      >
        {t("digest.publishSubtitle")}
      </p>

      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center">
        <a
          href="/my-digests"
          onClick={handleLinkClick}
          className="px-6 py-3 font-semibold transition-colors"
          style={{ fontFamily: "var(--font-body)", background: "#e9c176", color: "#041926" }}
        >
          {t("digest.publishCta")}
        </a>
        <a
          href="/AGENTS.md"
          target="_blank"
          rel="noopener noreferrer"
          className="text-on-primary/70 hover:text-on-primary transition-colors"
          style={{
            fontFamily: "var(--font-label)",
            fontSize: "0.8rem",
            letterSpacing: "0.06em",
            textDecoration: "underline",
            textUnderlineOffset: "4px",
          }}
        >
          {t("digest.publishLearn")}
        </a>
      </div>
    </div>
  );
}
