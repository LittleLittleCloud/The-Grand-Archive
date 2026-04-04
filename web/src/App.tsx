import { useState, useEffect, useMemo } from "react";
import type { Stats, CategoryConfig, SourceConfig } from "./types";
import type { EntryWithContent } from "./types";
import { api } from "./api";
import { useRouter } from "./router";
import EntryPage from "./EntryPage";

// ─── Helpers ────────────────────────────────────────

function timeAgo(dateStr: string): string {
  if (!dateStr) return "—";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return "—";
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} 小时前`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(dateStr).toLocaleDateString("zh-CN");
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  tech: "bg-blue-100 text-blue-800",
  news: "bg-red-100 text-red-800",
  blog: "bg-green-100 text-green-800",
  podcast: "bg-purple-100 text-purple-800",
  uncategorized: "bg-gray-100 text-gray-800",
};

// ─── Stat Card ──────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
      <div className="text-3xl">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
}

// ─── Bar Chart (pure CSS) ───────────────────────────

function BarChart({ data, label }: { data: Record<string, number>; label: string }) {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...sorted.map(([, v]) => v), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">{label}</h3>
      <div className="space-y-2">
        {sorted.slice(0, 10).map(([name, count]) => (
          <div key={name} className="flex items-center gap-3">
            <span className="text-xs text-gray-600 w-28 truncate text-right" title={name}>
              {name}
            </span>
            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono text-gray-500 w-8 text-right">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Activity Heatmap (last 30 days) ────────────────

function ActivityHeatmap({ data }: { data: Record<string, number> }) {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: data[key] || 0 });
  }
  const max = Math.max(...days.map((d) => d.count), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        近 30 天抓取活动
      </h3>
      <div className="flex gap-1 items-end h-24">
        {days.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="w-full rounded-sm transition-all duration-300 hover:opacity-80"
              style={{
                height: `${Math.max((d.count / max) * 80, 2)}px`,
                backgroundColor: d.count === 0 ? "#f3f4f6" : `rgba(99, 102, 241, ${0.3 + (d.count / max) * 0.7})`,
              }}
            />
            <div className="absolute -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
              {d.date}: {d.count} 条
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-400">
        <span>{days[0]?.date}</span>
        <span>{days[days.length - 1]?.date}</span>
      </div>
    </div>
  );
}

// ─── Tag Cloud ──────────────────────────────────────

function TagCloud({ tags }: { tags: Record<string, number> }) {
  const sorted = Object.entries(tags).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...sorted.map(([, v]) => v), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">标签云</h3>
      <div className="flex flex-wrap gap-2">
        {sorted.map(([tag, count]) => {
          const size = 0.75 + (count / max) * 0.5;
          return (
            <span
              key={tag}
              className="inline-block bg-indigo-50 text-indigo-700 rounded-full px-3 py-1 hover:bg-indigo-100 transition-colors cursor-default"
              style={{ fontSize: `${size}rem` }}
              title={`${count} 条`}
            >
              {tag}
              <span className="ml-1 text-indigo-400 text-xs">{count}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
// ─── Sources Table ─────────────────────────────────────

function SourcesTable({ sources }: { sources: SourceConfig[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? sources : sources.slice(0, 8);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide p-5 pb-3">
        订阅源状态
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400">
              <th className="text-left font-medium px-5 py-2">订阅源</th>
              <th className="text-left font-medium px-3 py-2">分类</th>
              <th className="text-left font-medium px-3 py-2">状态</th>
              <th className="text-left font-medium px-3 py-2">最后更新</th>
              <th className="text-right font-medium px-5 py-2">条目</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {shown.map((s) => {
              const st = s.status;
              const isOk = st?.lastResult === "success";
              const isErr = st?.lastResult === "error";
              return (
                <tr key={s.url} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-2.5">
                    <div className="font-medium text-gray-900 truncate max-w-[200px]" title={s.name}>
                      {s.name}
                    </div>
                    <div className="text-xs text-gray-400 truncate max-w-[200px]" title={s.url}>
                      {s.url.replace(/^https?:\/\//, "").slice(0, 40)}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[s.category] || CATEGORY_COLORS.uncategorized}`}>
                      {s.category}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {!st ? (
                      <span className="text-xs text-gray-300">未拉取</span>
                    ) : isOk ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        成功
                      </span>
                    ) : isErr ? (
                      <span className="inline-flex items-center gap-1 text-xs text-red-500" title={st.lastError}>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        失败
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                    {st ? timeAgo(st.lastFetched) : "—"}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    {st ? (
                      <span className="text-xs font-mono text-gray-600">
                        {st.entriesSaved > 0 && <span className="text-green-600">+{st.entriesSaved}</span>}
                        {st.entriesSaved > 0 && st.entriesSkipped > 0 && " / "}
                        {st.entriesSkipped > 0 && <span className="text-gray-400">{st.entriesSkipped} 已存在</span>}
                        {st.entriesSaved === 0 && st.entriesSkipped === 0 && <span className="text-gray-300">—</span>}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sources.length > 8 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 text-xs text-indigo-500 hover:text-indigo-700 hover:bg-gray-50 border-t border-gray-100 transition-colors cursor-pointer"
        >
          {expanded ? "收起" : `展开全部 ${sources.length} 个源`}
        </button>
      )}
    </div>
  );
}
// ─── Entry List ─────────────────────────────────────

function EntryList({
  entries,
  categories,
  filter,
  setFilter,
}: {
  entries: EntryWithContent[];
  categories: CategoryConfig[];
  filter: string;
  setFilter: (f: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [sourceFilters, setSourceFilters] = useState<Set<string>>(new Set());
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);

  const toggleSource = (s: string) => {
    setSourceFilters((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const uniqueSources = useMemo(() => {
    const sourceSet = new Set<string>();
    let list = entries;
    if (filter) list = list.filter((e) => e.category === filter);
    list.forEach((e) => e.source && sourceSet.add(e.source));
    return Array.from(sourceSet).sort();
  }, [entries, filter]);

  const filtered = useMemo(() => {
    let list = entries;
    if (filter) list = list.filter((e) => e.category === filter);
    if (sourceFilters.size > 0) list = list.filter((e) => sourceFilters.has(e.source));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.source.toLowerCase().includes(q) ||
          (e.tags && e.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }
    return list;
  }, [entries, filter, sourceFilters, search]);

  // Reset source filters when category changes and selected sources are no longer available
  useEffect(() => {
    setSourceFilters((prev) => {
      const next = new Set([...prev].filter((s) => uniqueSources.includes(s)));
      return next.size === prev.size ? prev : next;
    });
  }, [uniqueSources]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter("")}
            className={`px-3 py-1 rounded-full text-sm transition-colors cursor-pointer ${
              !filter ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            全部
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(filter === c.id ? "" : c.id)}
              className={`px-3 py-1 rounded-full text-sm transition-colors cursor-pointer ${
                filter === c.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="relative">
          <button
            onClick={() => setSourceDropdownOpen(!sourceDropdownOpen)}
            className={`px-3 py-1.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer flex items-center gap-1.5 ${
              sourceFilters.size > 0 ? "border-indigo-300 text-indigo-700" : "border-gray-200 text-gray-600"
            }`}
          >
            <span>
              {sourceFilters.size === 0
                ? "全部来源"
                : `已选 ${sourceFilters.size} 个来源`}
            </span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {sourceDropdownOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setSourceDropdownOpen(false)} />
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 min-w-[200px] max-h-60 overflow-y-auto">
                {sourceFilters.size > 0 && (
                  <button
                    onClick={() => { setSourceFilters(new Set()); setSourceDropdownOpen(false); }}
                    className="w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-red-50 border-b border-gray-100 cursor-pointer"
                  >
                    清除筛选
                  </button>
                )}
                {uniqueSources.map((s) => (
                  <label
                    key={s}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={sourceFilters.has(s)}
                      onChange={() => toggleSource(s)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="truncate">{s}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
        <input
          type="text"
          placeholder="搜索标题、来源、标签..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
        />
      </div>

      {/* Entries */}
      <div className="divide-y divide-gray-50">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">暂无条目</div>
        ) : (
          filtered.map((entry) => (
            <a
              key={`${entry.category}/${entry.filename}`}
              href={`#/entry/${entry.path || `feeds/${entry.category}/${entry.filename.replace(/\.md$/, '')}`}`}
              className="block p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate">{entry.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.uncategorized}`}
                    >
                      {entry.category}
                    </span>
                    <span className="text-xs text-gray-500">{entry.source}</span>
                    {entry.author && <span className="text-xs text-gray-400">· {entry.author}</span>}
                  </div>
                  {entry.content && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{entry.content.slice(0, 150)}</p>
                  )}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {entry.tags.map((t) => (
                        <span key={t} className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400 whitespace-nowrap flex flex-col items-end gap-1 shrink-0">
                  <span>{timeAgo(entry.published || entry.fetched)}</span>
                  <span className="text-gray-300">{formatDate(entry.published)}</span>
                </div>
              </div>
            </a>
          ))
        )}
      </div>

      <div className="p-3 border-t border-gray-100 text-xs text-gray-400 text-center">
        显示 {filtered.length} / {entries.length} 条
      </div>
    </div>
  );
}

// ─── App ────────────────────────────────────────────

export default function App() {
  const { route, navigate } = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [sources, setSources] = useState<SourceConfig[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.getStats(), api.getCategories(), api.getSources()])
      .then(([s, c, src]) => {
        setStats(s);
        setCategories(c);
        setSources(src);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Entry detail page
  if (route.page === "entry" && route.params.path) {
    return (
      <EntryPage
        path={route.params.path}
        onBack={() => navigate("home")}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-lg animate-pulse">加载中...</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500 text-center">
          <p className="text-lg font-medium">加载失败</p>
          <p className="text-sm mt-1">{error || "无法获取数据"}</p>
          <p className="text-xs text-gray-400 mt-4">
            请先运行 <code className="bg-gray-100 px-2 py-1 rounded">bun run generate</code> 生成数据
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📚</span>
            <div>
              <h1 className="text-lg font-bold text-gray-900">大案牍库</h1>
              <p className="text-xs text-gray-400">RSS Feed Dashboard</p>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            更新于 {formatDate(stats.lastUpdated)}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon="📰" label="总条目" value={stats.totalEntries} />
          <StatCard icon="📡" label="订阅源" value={stats.totalSources} />
          <StatCard icon="📂" label="分类数" value={stats.totalCategories} />
          <StatCard icon="🏷️" label="标签数" value={Object.keys(stats.tagCloud).length} />
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-4">
          <BarChart data={stats.entriesByCategory} label="按分类" />
          <BarChart data={stats.entriesBySource} label="按来源" />
        </div>

        {/* Activity + Tags */}
        <div className="grid md:grid-cols-2 gap-4">
          <ActivityHeatmap data={stats.entriesByDate} />
          <TagCloud tags={stats.tagCloud} />
        </div>

        {/* Sources Status */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            订阅源状态
          </h2>
          <SourcesTable sources={sources} />
        </div>

        {/* Entry List */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            最近条目
          </h2>
          <EntryList
            entries={stats.recentEntries}
            categories={categories}
            filter={filter}
            setFilter={setFilter}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-center text-xs text-gray-400">
          大案牍库 · Bun + React + TailwindCSS
        </div>
      </footer>
    </div>
  );
}