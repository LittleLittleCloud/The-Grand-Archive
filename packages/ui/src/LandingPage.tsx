import { useEffect, useState } from "react";
import { api } from "./api";
import type { StatsResponse } from "@dak/contract";

export function LandingPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getStats().then(setStats).catch((e) => setError((e as Error).message));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight">大案牍库</h1>
          <div className="mt-8 flex justify-center gap-4">
            <a
              href="#/search"
              className="px-6 py-3 bg-white text-indigo-700 font-semibold rounded-lg shadow hover:bg-indigo-50 transition"
            >
              Search Feeds
            </a>
            <a
              href="https://github.com/littlelittlecloud/The-Grand-Archive"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border border-white/40 text-white font-semibold rounded-lg hover:bg-white/10 transition"
            >
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Stats Dashboard */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Archive Stats
        </h2>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg mb-6">
            Could not load stats: {error}
          </div>
        )}

        {!stats && !error && (
          <p className="text-gray-400">Loading stats…</p>
        )}

        {stats && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard label="Total Entries" value={stats.total} />
              <StatCard
                label="Categories"
                value={stats.byCategory.length}
              />
              <StatCard label="Sources" value={stats.bySource.length} />
              {stats.lastUpdated && (
                <StatCard
                  label="Last Updated"
                  text={new Date(stats.lastUpdated).toLocaleString()}
                />
              )}
            </div>

            {/* Bar charts */}
            <div className="grid md:grid-cols-2 gap-8">
              <BarChart
                title="Entries by Category"
                data={stats.byCategory.map((c) => ({
                  label: c.category,
                  value: c.count,
                }))}
              />
              <BarChart
                title="Top Sources"
                data={stats.bySource
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 10)
                  .map((s) => ({ label: s.source, value: s.count }))}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, text }: { label: string; value?: number; text?: string }) {
  return (
    <div className="bg-white rounded-xl border p-6 shadow-sm text-center">
      <p className="text-3xl font-extrabold text-indigo-600">
        {text ?? value?.toLocaleString()}
      </p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
}

function BarChart({
  title,
  data,
}: {
  title: string;
  data: { label: string; value: number }[];
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="bg-white rounded-xl border p-6 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      <ul className="space-y-2">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-3 text-sm">
            <span className="w-28 truncate text-gray-600 text-right">
              {d.label}
            </span>
            <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${(d.value / max) * 100}%` }}
              />
            </div>
            <span className="w-10 text-gray-500 text-right">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
