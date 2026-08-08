import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { handleLinkClick } from "./router";

/**
 * Reusable tabbed specimen card (Tell Your Agent / Skill / curl) with a copy
 * button. Code snippets use the live origin so they are copy-paste ready in any
 * environment. Used on public digest pages and the landing-page publish slide.
 */
export function DigestAgentTabs() {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);

  const base =
    typeof window !== "undefined" ? window.location.origin : "https://dak-news.com";

  const tabs = useMemo(
    () => [
      {
        label: "Tell Your Agent",
        code: `Read ${base}/AGENTS.md, then curate today's most important stories from The Grand Archive and publish them as a digest via POST /api/digests using my API key. Share the public link when you're done.`,
      },
      {
        label: "Skill",
        code: `$ npx skills add LittleLittleCloud/The-Grand-Archive

✓ Added skill: dak-digest (Generate & publish a digest)

You: Generate today's digest and publish it

Agent: Curated 12 stories across finance, world,
       and technology. Published "The Grand Dispatch".
       Public link: ${base}/d/2dbb0ba2908312ed...`,
      },
      {
        label: "curl",
        code: `# 1. Discover the exact content format
curl "${base}/api/digests/schema"

# 2. Publish a digest (auth: your API key)
curl -X POST "${base}/api/digests" \\
  -H "Authorization: Bearer dak_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"lang":"en","date":"2026-08-07","content":{ ... }}'

# 3. Share it publicly → returns a shareId + public URL
curl -X POST "${base}/api/digests/DIGEST_ID/share" \\
  -H "Authorization: Bearer dak_your_key" \\
  -d '{"visibility":"public"}'`,
      },
    ],
    [base]
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(tabs[active].code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
      <div
        className="overflow-hidden"
        style={{ background: "#f7f4ed", borderRadius: "12px", boxShadow: "0px 12px 32px rgba(28,28,24,0.12)" }}
      >
        {/* Tabs + copy */}
        <div className="flex items-stretch" style={{ background: "#ece8df" }}>
          {tabs.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActive(i)}
              className="px-3 sm:px-4 py-2 text-xs transition-colors cursor-pointer whitespace-nowrap"
              style={{
                fontFamily: "var(--font-label)",
                letterSpacing: "0.05em",
                background: active === i ? "#f7f4ed" : "#ece8df",
                color: active === i ? "#3b3630" : "#8a8478",
              }}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={copy}
            className="ml-auto px-3 sm:px-4 py-2 text-xs cursor-pointer"
            style={{
              fontFamily: "var(--font-label)",
              letterSpacing: "0.05em",
              color: "#6f5a44",
            }}
          >
            {copied ? t("generateDigest.copied") : t("generateDigest.copy")}
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
          <pre
            className="whitespace-pre-wrap break-words leading-relaxed"
            style={{
              fontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
              fontSize: "0.82rem",
              color: "#3b3630",
              margin: 0,
            }}
          >
            {tabs[active].code}
          </pre>
        </div>
      </div>
  );
}

/**
 * "Publish your own digest" section for public digest pages — heading, subtitle,
 * the agent tabs, and a get-an-API-key link.
 */
export function GenerateDigestCard() {
  const { t } = useTranslation();
  return (
    <section className="mt-12">
      <h2
        className="text-on-surface"
        style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700 }}
      >
        {t("generateDigest.title")}
      </h2>
      <p
        className="mt-2 mb-5 text-on-surface-variant"
        style={{ fontFamily: "var(--font-body)", fontSize: "0.95rem", lineHeight: 1.6 }}
      >
        {t("generateDigest.subtitle")}
      </p>

      <DigestAgentTabs />

      <a
        href="/api-keys"
        onClick={handleLinkClick}
        className="inline-block mt-4"
        style={{
          fontFamily: "var(--font-label)",
          fontSize: "0.8rem",
          letterSpacing: "0.04em",
          color: "#6f5a44",
          borderBottom: "1px solid #b8860b",
        }}
      >
        {t("generateDigest.getApiKey")}
      </a>
    </section>
  );
}
