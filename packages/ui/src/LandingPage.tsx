import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "./api";
import type { StatsResponse } from "@dak/contract";

/* ─── Data ─── */

const SOURCES: Record<string, string[]> = {
  "Finance / Macro": [
    "Bloomberg", "CNBC", "MarketWatch", "华尔街见闻", "第一财经",
    "财新网", "ZeroHedge", "金十数据", "雪球",
  ],
  "International / Geopolitics": [
    "BBC Chinese", "NYT Chinese", "Al Jazeera", "AP News",
    "Foreign Affairs", "The Diplomat", "参考消息", "人民网",
  ],
  Tech: ["Hacker News"],
  "Social Trending": ["Weibo Hot", "Zhihu Hot"],
};

const FEATURES_KEYS = [
  { titleKey: "features.aiNative", descKey: "features.aiNativeDesc" },
  { titleKey: "features.fullTextSearch", descKey: "features.fullTextSearchDesc" },
  { titleKey: "features.liveSources", descKey: "features.liveSourcesDesc" },
  { titleKey: "features.sdk", descKey: "features.sdkDesc" },
  { titleKey: "features.cli", descKey: "features.cliDesc" },
  { titleKey: "features.tieredAccess", descKey: "features.tieredAccessDesc" },
];

const CODE_TABS = [
  {
    label: "Skill",
    code: `$ npx skills add LittleLittleCloud/The-Grand-Archive

✓ Added skill: dak (Search & Browse)
✓ Added skill: dak_summary (Structured Analysis)

You: Search recent finance news about oil prices

Agent: Found 23 results across Bloomberg, CNBC,
       and MarketWatch.

Key findings:
• Oil prices surged 12% following Iran conflict
• Central banks face fresh inflation pressure
• UAE considers freezing Iranian assets (WSJ)`,
  },
  {
    label: "SDK",
    code: `import { DakClient } from "@littlelittlecloud/dak";

const client = new DakClient({
  baseUrl: "https://dak-news.com",
});

const result = await client.search({
  q: "tariff",
  category: "finance",
  limit: 10,
});

console.log(result.results[0].title);`,
  },
  {
    label: "CLI",
    code: `$ npm install -g @littlelittlecloud/dak-cli

$ dak search "inflation" --category finance

  1. Core wholesale prices rose 0.8% in January
     Bloomberg · finance · 2026-02-27 · score: 8.4

  2. As Trump declares inflation tamed, Iran conflict
     threatens new price pressures
     CNBC · finance · 2026-03-02 · score: 7.9

  3. Middle East conflict poses fresh test to central
     banks as oil shock fuels inflation
     AP News · finance · 2026-03-04 · score: 7.6`,
  },
];

const STEPS_KEYS = [
  { num: "01", titleKey: "steps.installTitle", descKey: "steps.installDesc" },
  { num: "02", titleKey: "steps.queryTitle", descKey: "steps.queryDesc" },
  { num: "03", titleKey: "steps.analyzeTitle", descKey: "steps.analyzeDesc" },
];

/* ─── Component ─── */

export function LandingPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="bg-surface">
      {/* ═══ 1. Hero ═══ */}
      <section
        style={{ background: "linear-gradient(135deg, #041926 0%, #1a2e3b 100%)" }}
      >
        <div className="pt-28 pb-16 px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-9 gap-12 items-start">
            {/* Left — headline */}
            <div className="lg:col-span-4">
              <h1
                className="text-on-primary font-extrabold leading-tight"
                style={{ fontFamily: "var(--font-display)", fontSize: "3.5rem" }}
              >
                {t("hero.title1")}
                {t("hero.title2") && <><br />{t("hero.title2")}</>}
              </h1>
              <p
                className="mt-4 text-on-primary/70 max-w-xl leading-relaxed"
                style={{ fontFamily: "var(--font-body)", fontSize: "1.05rem" }}
              >
                {t("hero.subtitle")}
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <a
                  href="https://discord.gg/TODO"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-3 text-on-primary font-semibold transition-colors"
                  style={{
                    fontFamily: "var(--font-body)",
                    background: "#5865F2",
                  }}
                >
                  {t("hero.discord")}
                </a>
                <a
                  href="https://github.com/littlelittlecloud/The-Grand-Archive"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-3 text-on-primary/80 hover:text-on-primary transition-colors"
                  style={{
                    fontFamily: "var(--font-body)",
                    textDecoration: "underline",
                    textUnderlineOffset: "4px",
                  }}
                >
                  {t("hero.github")}
                </a>
              </div>
            </div>

            {/* Right — code specimen */}
            <div className="lg:col-span-4 hidden lg:block">
              <div
                className="overflow-hidden"
                style={{ background: "#f7f4ed", fontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace", fontSize: "0.85rem", borderRadius: "12px", boxShadow: "0px 12px 32px rgba(28,28,24,0.12)" }}
              >
                {/* Title bar */}
                <div className="flex items-center gap-2.5 px-5 py-3" style={{ background: "#ece8df" }}>
                  <span className="w-3.5 h-3.5 inline-block" style={{ background: "#ff5f57", borderRadius: "50%" }} />
                  <span className="w-3.5 h-3.5 inline-block" style={{ background: "#febc2e", borderRadius: "50%" }} />
                  <span className="w-3.5 h-3.5 inline-block" style={{ background: "#28c840", borderRadius: "50%" }} />
                  <span className="ml-2 text-xs" style={{ color: "#8a8478", fontFamily: "var(--font-label)" }}>bash</span>
                </div>
                {/* Terminal body */}
                <div className="px-5 py-5 overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
                  <pre className="whitespace-pre leading-relaxed" style={{ color: "#3b3630" }}>
<span style={{ color: "#6a7d45" }}>$</span>{` npx skills add LittleLittleCloud/The-Grand-Archive`}
{`\n`}
<span style={{ color: "#2e7d6a" }}>✓</span>{` Added skill: dak (Search & Browse)`}
<span style={{ color: "#2e7d6a" }}>{`\n✓`}</span>{` Added skill: dak_summary (Structured Analysis)`}
<span style={{ color: "#2e7d6a" }}>{`\n✓`}</span>{` Installed: @littlelittlecloud/dak-cli`}
{`\n`}
{`Done. Tell your agent:`}
<span style={{ color: "#96622d" }}>{`\n"Search recent news about tariffs"`}</span>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Source Ticker — bottom strip of hero */}
        <div
          className="overflow-hidden py-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center">
            <span
              className="shrink-0 z-10 pl-6 pr-4 uppercase text-gold"
              style={{
                fontFamily: "var(--font-label)",
                fontSize: "0.65rem",
                letterSpacing: "0.1em",
                background: "var(--color-primary)",
              }}
            >
              {t("hero.tracking")}
            </span>
            <div className="ticker-track">
              {[0, 1].map((copy) => (
                <div key={copy} className="ticker-scroll flex gap-5" aria-hidden={copy === 1}>
                  {Object.entries(SOURCES).flatMap(([category, sources]) =>
                    sources.map((s) => (
                      <span
                        key={`${copy}-${s}`}
                        className="shrink-0 px-3 py-1 whitespace-nowrap text-on-primary/80"
                        style={{
                          fontFamily: "var(--font-label)",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          letterSpacing: "0.05em",
                        }}
                        title={category}
                      >
                        {s}
                      </span>
                    ))
                  )}
                  <span className="shrink-0 px-2 text-on-primary/15">·</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 2. Live Stats Strip ═══ */}
      {stats && (
        <section className="bg-surface">
          <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8">
            <StatFigure value={stats.total.toLocaleString()} label={t("stats.totalEntries")} />
            <StatFigure value={String(stats.byCategory.length)} label={t("stats.categories")} />
            <StatFigure value={String(stats.bySource.length)} label={t("stats.sources")} />
            {stats.lastUpdated && (
              <StatFigure
                value={new Date(stats.lastUpdated).toLocaleDateString()}
                label={t("stats.lastUpdated")}
              />
            )}
          </div>
        </section>
      )}

      {/* ═══ 4. Features ═══ */}
      <section className="bg-surface-low">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2
            className="text-on-surface mb-12"
            style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 700 }}
          >
            {t("features.title")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
            {FEATURES_KEYS.map((f) => (
              <div key={f.titleKey}>
                <h3
                  className="text-on-surface mb-2"
                  style={{ fontFamily: "var(--font-body)", fontSize: "1.125rem", fontWeight: 600 }}
                >
                  {t(f.titleKey)}
                </h3>
                <p
                  className="text-on-surface-variant leading-relaxed"
                  style={{ fontFamily: "var(--font-body)", fontSize: "1rem" }}
                >
                  {t(f.descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 5. Code Specimens ═══ */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2
          className="text-on-surface mb-8"
          style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 700 }}
        >
          {t("integration.title")}
        </h2>

        {/* Tabs — archive tags */}
        <div className="flex gap-0 mb-0">
          {CODE_TABS.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(i)}
              className="px-5 py-2 text-sm transition-colors cursor-pointer"
              style={{
                fontFamily: "var(--font-label)",
                letterSpacing: "0.05em",
                background: activeTab === i ? "var(--color-tertiary-container)" : "var(--color-surface-container-low)",
                color: activeTab === i ? "var(--color-tertiary-fixed)" : "var(--color-on-surface-variant)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Code block — terminal style */}
        <div
          className="overflow-hidden"
          style={{ background: "#f7f4ed", borderRadius: "12px", boxShadow: "0px 12px 32px rgba(28,28,24,0.12)" }}
        >
          {/* Title bar */}
          <div className="flex items-center gap-2.5 px-5 py-3" style={{ background: "#ece8df" }}>
            <span className="w-3.5 h-3.5 inline-block" style={{ background: "#ff5f57", borderRadius: "50%" }} />
            <span className="w-3.5 h-3.5 inline-block" style={{ background: "#febc2e", borderRadius: "50%" }} />
            <span className="w-3.5 h-3.5 inline-block" style={{ background: "#28c840", borderRadius: "50%" }} />
            <span className="ml-2 text-xs" style={{ color: "#8a8478", fontFamily: "var(--font-label)" }}>
              {CODE_TABS[activeTab].label}
            </span>
          </div>
          {/* Terminal body */}
          <div className="px-5 py-5 overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
            <pre
              className="whitespace-pre leading-relaxed"
              style={{ fontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace", fontSize: "0.85rem", color: "#3b3630" }}
            >
              {CODE_TABS[activeTab].code}
            </pre>
          </div>
        </div>
      </section>

      {/* ═══ 6. How It Works ═══ */}
      <section className="bg-surface-low">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2
            className="text-on-surface mb-12"
            style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 700 }}
          >
            {t("steps.title")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {STEPS_KEYS.map((s) => (
              <div key={s.num}>
                <span
                  className="block mb-3"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "3rem",
                    fontWeight: 800,
                    color: "var(--color-tertiary-fixed-dim)",
                  }}
                >
                  {s.num}
                </span>
                <h3
                  className="text-on-surface mb-2"
                  style={{ fontFamily: "var(--font-body)", fontSize: "1.125rem", fontWeight: 600 }}
                >
                  {t(s.titleKey)}
                </h3>
                <p
                  className="text-on-surface-variant leading-relaxed"
                  style={{ fontFamily: "var(--font-body)", fontSize: "1rem" }}
                >
                  {t(s.descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 7. Access Tiers ═══ */}
      <section className="bg-surface">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2
            className="text-on-surface mb-12"
            style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 700 }}
          >
            {t("tiers.title")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Anonymous */}
            <div className="p-8 transition-colors hover:bg-surface-low" style={{ background: "var(--color-surface-container-low)" }}>
              <span
                className="uppercase text-on-surface-variant"
                style={{ fontFamily: "var(--font-label)", fontSize: "0.75rem", letterSpacing: "0.08em" }}
              >
                {t("tiers.anonymous")}
              </span>
              <p
                className="mt-4 text-on-surface"
                style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 800 }}
              >
                {t("tiers.days28")}
              </p>
              <p
                className="mt-1 text-on-surface-variant"
                style={{ fontFamily: "var(--font-label)", fontSize: "0.8rem", letterSpacing: "0.03em" }}
              >
                {t("tiers.ofSearchHistory")}
              </p>
              <ul className="mt-6 space-y-2" style={{ fontFamily: "var(--font-body)", fontSize: "0.95rem" }}>
                <li className="text-on-surface-variant">{t("tiers.fullTextSearch")}</li>
                <li className="text-on-surface-variant">{t("tiers.allCategoriesSources")}</li>
                <li className="text-on-surface-variant">{t("tiers.rateLimit10")}</li>
              </ul>
              <div className="mt-8">
                <span
                  className="text-on-surface-variant"
                  style={{ fontFamily: "var(--font-label)", fontSize: "0.8rem", letterSpacing: "0.05em" }}
                >
                  {t("tiers.noSignUp")}
                </span>
              </div>
            </div>

            {/* Free */}
            <div
              className="p-8 relative"
              style={{ background: "var(--color-primary)" }}
            >
              <span
                className="uppercase"
                style={{ fontFamily: "var(--font-label)", fontSize: "0.75rem", letterSpacing: "0.08em", color: "var(--color-tertiary-fixed-dim)" }}
              >
                {t("tiers.free")}
              </span>
              <p
                className="mt-4 text-on-primary"
                style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 800 }}
              >
                {t("tiers.days90")}
              </p>
              <p
                className="mt-1 text-on-primary/60"
                style={{ fontFamily: "var(--font-label)", fontSize: "0.8rem", letterSpacing: "0.03em" }}
              >
                {t("tiers.ofSearchHistory")}
              </p>
              <ul className="mt-6 space-y-2" style={{ fontFamily: "var(--font-body)", fontSize: "0.95rem" }}>
                <li className="text-on-primary/80">{t("tiers.fullTextSearch")}</li>
                <li className="text-on-primary/80">{t("tiers.allCategoriesSources")}</li>
                <li className="text-on-primary/80">{t("tiers.apiKeyAccess")}</li>
                <li className="text-on-primary/80">{t("tiers.rateLimit60")}</li>
              </ul>
              <div className="mt-8">
                <a
                  href="#/login"
                  className="inline-block px-5 py-2.5 bg-on-primary text-primary font-medium hover:bg-on-primary/90 transition-colors"
                  style={{ fontFamily: "var(--font-label)", fontSize: "0.8rem", letterSpacing: "0.05em" }}
                >
                  {t("tiers.signInToStart")}
                </a>
              </div>
            </div>

            {/* Premium */}
            <div className="p-8 transition-colors hover:bg-surface-low" style={{ background: "var(--color-surface-container-low)" }}>
              <span
                className="uppercase text-on-surface-variant"
                style={{ fontFamily: "var(--font-label)", fontSize: "0.75rem", letterSpacing: "0.08em" }}
              >
                {t("tiers.premium")}
              </span>
              <p
                className="mt-4 text-on-surface"
                style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 800 }}
              >
                {t("tiers.unlimited")}
              </p>
              <p
                className="mt-1 text-on-surface-variant"
                style={{ fontFamily: "var(--font-label)", fontSize: "0.8rem", letterSpacing: "0.03em" }}
              >
                {t("tiers.fullArchiveAccess")}
              </p>
              <ul className="mt-6 space-y-2" style={{ fontFamily: "var(--font-body)", fontSize: "0.95rem" }}>
                <li className="text-on-surface-variant">{t("tiers.everythingInFree")}</li>
                <li className="text-on-surface-variant">{t("tiers.unlimitedHistory")}</li>
                <li className="text-on-surface-variant">{t("tiers.rateLimit120")}</li>
                <li className="text-on-surface-variant">{t("tiers.dedicatedSupport")}</li>
              </ul>
              <div className="mt-8">
                <a
                  href="mailto:bigmiao.zhang@gmail.com"
                  className="inline-block text-secondary hover:text-on-surface transition-colors"
                  style={{
                    fontFamily: "var(--font-label)",
                    fontSize: "0.8rem",
                    letterSpacing: "0.05em",
                    textDecoration: "underline",
                    textUnderlineOffset: "3px",
                  }}
                >
                  {t("tiers.contactUs")}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 8. Footer ═══ */}
      <footer className="bg-surface-low">
        <div
          className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
        >
          <div>
            <span
              className="text-on-surface font-bold"
              style={{ fontFamily: "var(--font-display)", fontSize: "1.125rem" }}
            >
              {t("footer.brand")}
            </span>
            <p
              className="mt-1 text-on-surface-variant"
              style={{ fontFamily: "var(--font-label)", fontSize: "0.75rem", letterSpacing: "0.05em" }}
            >
              {t("footer.tagline")}
            </p>
          </div>
          <div className="flex gap-6">
            <FooterLink href="https://github.com/littlelittlecloud/The-Grand-Archive">GitHub</FooterLink>
            <FooterLink href="https://discord.gg/TODO">Discord</FooterLink>
            <FooterLink href="https://www.npmjs.com/package/@littlelittlecloud/dak">npm SDK</FooterLink>
            <FooterLink href="https://www.npmjs.com/package/@littlelittlecloud/dak-cli">npm CLI</FooterLink>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Sub-components ─── */

function StatFigure({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <span
        className="block text-on-surface"
        style={{ fontFamily: "var(--font-display)", fontSize: "2.25rem", fontWeight: 800 }}
      >
        {value}
      </span>
      <span
        className="block mt-1 text-on-surface-variant uppercase"
        style={{ fontFamily: "var(--font-label)", fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.05em" }}
      >
        {label}
      </span>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-secondary hover:text-on-surface transition-colors"
      style={{
        fontFamily: "var(--font-label)",
        fontSize: "0.75rem",
        letterSpacing: "0.05em",
        textDecoration: "underline",
        textUnderlineOffset: "3px",
      }}
    >
      {children}
    </a>
  );
}
