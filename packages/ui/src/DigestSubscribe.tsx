import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { DigestLang } from "@dak/contract";
import { api, ApiError } from "./api";

/**
 * Landing-page email capture for the daily digest. Standalone (no account
 * required); language defaults to the detected UI locale but is editable.
 */
export function DigestSubscribe() {
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
    <section style={{ background: "linear-gradient(135deg, #041926 0%, #1a2e3b 100%)" }}>
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
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
    </section>
  );
}
