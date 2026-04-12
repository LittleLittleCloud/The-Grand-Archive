import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "./api";
import type { FeedsStatusResponse, FeedStatus, DailyBin } from "@dak/contract";

/* ─── Helpers ─── */

function timeAgo(iso: string | null, t: (k: string) => string): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return t("feeds.minutesAgo").replace("{{n}}", String(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("feeds.hoursAgo").replace("{{n}}", String(hours));
  const days = Math.floor(hours / 24);
  return t("feeds.daysAgo").replace("{{n}}", String(days));
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

/** Build a map of day -> count for a source, filling missing days with 0 */
function buildDayMap(
  bins: DailyBin[],
  source: string,
  days: string[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const d of days) map.set(d, 0);
  for (const b of bins) {
    if (b.source === source) map.set(b.day, b.count);
  }
  return map;
}

/** Generate the last N days as YYYY-MM-DD strings */
function lastNDays(n: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

/* ─── Color scale ─── */

function heatColor(count: number, max: number): string {
  if (count === 0) return "var(--color-surface-container-high)";
  const ratio = Math.min(count / Math.max(max, 1), 1);
  if (ratio < 0.25) return "#c6e48b";
  if (ratio < 0.5) return "#7bc96f";
  if (ratio < 0.75) return "#239a3b";
  return "#196127";
}

/* ─── Components ─── */

function HeatmapRow({
  source,
  bins,
  days,
  maxCount,
}: {
  source: string;
  bins: DailyBin[];
  days: string[];
  maxCount: number;
}) {
  const dayMap = buildDayMap(bins, source, days);

  return (
    <div className="flex items-center gap-[1px]" style={{ width: "100%" }}>
      {days.map((day) => {
        const count = dayMap.get(day) ?? 0;
        return (
          <div
            key={day}
            title={`${day}: ${count}`}
            style={{
              flex: "1 1 0",
              height: 8,
              minWidth: 0,
              background: heatColor(count, maxCount),
            }}
          />
        );
      })}
    </div>
  );
}

function MonthLabels({ days }: { days: string[] }) {
  const labels: { label: string; offset: number }[] = [];
  let lastMonth = "";
  for (let i = 0; i < days.length; i++) {
    const month = days[i].slice(0, 7); // YYYY-MM
    if (month !== lastMonth) {
      labels.push({
        label: month.replace("-", "/"),
        offset: i,
      });
      lastMonth = month;
    }
  }
  return (
    <div className="flex relative" style={{ height: 14, marginLeft: 0, width: "100%" }}>
      {labels.map((l) => (
        <span
          key={l.offset}
          className="absolute text-on-surface-variant"
          style={{
            left: `${(l.offset / days.length) * 100}%`,
            fontSize: "0.6rem",
            fontFamily: "var(--font-label)",
            letterSpacing: "0.03em",
          }}
        >
          {l.label}
        </span>
      ))}
    </div>
  );
}

/* ─── Main Page ─── */

export function FeedsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<FeedsStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);

  useEffect(() => {
    api
      .getFeedsStatus()
      .then(setData)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const days = lastNDays(90);

  // Global max for consistent color scale
  const maxCount =
    data?.dailyBins.reduce((mx, b) => Math.max(mx, b.count), 0) ?? 1;

  return (
    <div className="min-h-screen bg-surface pt-14">
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1
          className="text-on-surface mb-2"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.75rem",
            fontWeight: 600,
          }}
        >
          {t("feeds.title")}
        </h1>
        <p
          className="text-on-surface-variant mb-8"
          style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem" }}
        >
          {t("feeds.subtitle")}
        </p>

        {loading && (
          <p className="text-on-surface-variant" style={{ fontFamily: "var(--font-body)" }}>
            {t("feeds.loading")}
          </p>
        )}

        {error && (
          <div className="mb-6 p-4 bg-surface-low text-on-surface">{error}</div>
        )}

        {data && (
          <div>
            {/* Month labels */}
            <div style={{ paddingLeft: 220, marginBottom: 4 }}>
              <MonthLabels days={days} />
            </div>

            {/* Feed rows */}
            <div className="space-y-0">
              {data.feeds.map((feed, i) => (
                <FeedRow
                  key={feed.source}
                  feed={feed}
                  bins={data.dailyBins}
                  days={days}
                  maxCount={maxCount}
                  index={i}
                  expanded={expandedSource === feed.source}
                  onToggle={() =>
                    setExpandedSource(
                      expandedSource === feed.source ? null : feed.source
                    )
                  }
                  t={t}
                />
              ))}
            </div>

            {/* Legend */}
            <div
              className="flex items-center gap-2 mt-6"
              style={{ paddingLeft: 220 }}
            >
              <span
                className="text-on-surface-variant"
                style={{ fontSize: "0.65rem", fontFamily: "var(--font-label)" }}
              >
                {t("feeds.less")}
              </span>
              {[0, 0.25, 0.5, 0.75, 1].map((r) => (
                <div
                  key={r}
                  style={{
                    width: 8,
                    height: 8,
                    background: heatColor(r * maxCount, maxCount),
                  }}
                />
              ))}
              <span
                className="text-on-surface-variant"
                style={{ fontSize: "0.65rem", fontFamily: "var(--font-label)" }}
              >
                {t("feeds.more")}
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function FeedRow({
  feed,
  bins,
  days,
  maxCount,
  index,
  expanded,
  onToggle,
  t,
}: {
  feed: FeedStatus;
  bins: DailyBin[];
  days: string[];
  maxCount: number;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  t: (k: string) => string;
}) {
  const isStale =
    feed.lastIngested &&
    Date.now() - new Date(feed.lastIngested).getTime() > 2 * 60 * 60_000;

  return (
    <div
      style={{
        background:
          index % 2 === 0
            ? "var(--color-surface)"
            : "var(--color-surface-container-low)",
      }}
    >
      <div
        className="flex items-center py-3 px-4 cursor-pointer hover:bg-surface-low transition-colors"
        onClick={onToggle}
      >
        {/* Source name + category */}
        <div className="flex-shrink-0" style={{ width: 200 }}>
          <div className="flex items-center gap-2">
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isStale ? "#d32f2f" : "#4caf50",
                flexShrink: 0,
              }}
              title={
                isStale ? t("feeds.stale") : t("feeds.active")
              }
            />
            <span
              className="text-on-surface truncate"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "0.85rem",
                fontWeight: 500,
              }}
            >
              {feed.source}
            </span>
          </div>
          <span
            className="text-on-surface-variant"
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "0.65rem",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              marginLeft: 14,
            }}
          >
            {feed.category}
          </span>
        </div>

        {/* Heatmap */}
        <div className="flex-1 overflow-hidden">
          <HeatmapRow
            source={feed.source}
            bins={bins}
            days={days}
            maxCount={maxCount}
          />
        </div>

        {/* Entry count */}
        <div
          className="flex-shrink-0 text-right"
          style={{ width: 60 }}
        >
          <span
            className="text-on-surface"
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            {feed.entryCount.toLocaleString()}
          </span>
        </div>

        {/* Expand chevron */}
        <svg
          className={`w-4 h-4 ml-2 text-on-surface-variant transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="square" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div
          className="px-4 pb-4 grid grid-cols-3 gap-4"
          style={{ marginLeft: 220 }}
        >
          <DetailCard
            label={t("feeds.lastUpdated")}
            value={timeAgo(feed.lastIngested, t)}
          />
          <DetailCard
            label={t("feeds.dateRange")}
            value={`${formatDate(feed.earliest)} — ${formatDate(feed.latest)}`}
          />
          <DetailCard
            label={t("feeds.entryCount")}
            value={feed.entryCount.toLocaleString()}
          />
        </div>
      )}
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2">
      <div
        className="text-on-surface-variant mb-1"
        style={{
          fontFamily: "var(--font-label)",
          fontSize: "0.65rem",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        className="text-on-surface"
        style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem" }}
      >
        {value}
      </div>
    </div>
  );
}
