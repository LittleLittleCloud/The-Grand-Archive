import { useState, useEffect } from "react";
import { api } from "./api";
import type { EntryWithContent } from "./types";

const CATEGORY_COLORS: Record<string, string> = {
  tech: "bg-blue-100 text-blue-800",
  news: "bg-red-100 text-red-800",
  finance: "bg-amber-100 text-amber-800",
  social: "bg-pink-100 text-pink-800",
  blog: "bg-green-100 text-green-800",
  podcast: "bg-purple-100 text-purple-800",
  uncategorized: "bg-gray-100 text-gray-800",
};

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

export default function EntryPage({
  path,
  onBack,
}: {
  path: string;
  onBack: () => void;
}) {
  const [entry, setEntry] = useState<EntryWithContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .getEntry(path)
      .then(setEntry)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [path]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-lg animate-pulse">加载中...</div>
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <button
            onClick={onBack}
            className="text-sm text-indigo-500 hover:text-indigo-700 mb-6 cursor-pointer flex items-center gap-1"
          >
            ← 返回
          </button>
          <div className="text-center text-red-500">
            <p className="text-lg font-medium">加载失败</p>
            <p className="text-sm mt-1">{error || "找不到该条目"}</p>
          </div>
        </div>
      </div>
    );
  }

  const shareUrl = `${window.location.origin}${window.location.pathname}#/entry/${path}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="text-sm text-indigo-500 hover:text-indigo-700 cursor-pointer flex items-center gap-1"
          >
            ← 大案牍库
          </button>
          <div className="flex items-center gap-3">
            {entry.link && (
              <a
                href={entry.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-400 hover:text-indigo-500 transition-colors"
              >
                原文 ↗
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Article */}
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Meta */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-3">{entry.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.uncategorized}`}
            >
              {entry.category}
            </span>
            <span className="text-gray-500">{entry.source}</span>
            {entry.author && <span className="text-gray-400">· {entry.author}</span>}
            <span className="text-gray-400">· {formatDate(entry.published)}</span>
          </div>
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex gap-1 mt-3 flex-wrap">
              {entry.tags.map((t) => (
                <span key={t} className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="prose prose-sm prose-gray max-w-none [&_a]:text-indigo-600 [&_a:hover]:text-indigo-800 [&_img]:rounded-lg [&_blockquote]:border-l-indigo-300">
          {/* Render markdown as plain text with basic formatting */}
          {entry.content.split("\n").map((line, i) => {
            // Headings
            if (line.startsWith("### ")) return <h3 key={i} className="text-lg font-semibold mt-6 mb-2">{line.slice(4)}</h3>;
            if (line.startsWith("## ")) return <h2 key={i} className="text-xl font-semibold mt-8 mb-3">{line.slice(3)}</h2>;
            if (line.startsWith("# ")) return <h1 key={i} className="text-2xl font-bold mt-8 mb-3">{line.slice(2)}</h1>;
            // Blockquote
            if (line.startsWith("> ")) return <blockquote key={i} className="border-l-4 border-indigo-200 pl-4 text-gray-600 italic my-2">{line.slice(2)}</blockquote>;
            // List items
            if (/^[-*] /.test(line)) return <li key={i} className="ml-4 list-disc text-gray-700 my-0.5">{line.slice(2)}</li>;
            if (/^\d+\. /.test(line)) return <li key={i} className="ml-4 list-decimal text-gray-700 my-0.5">{line.replace(/^\d+\. /, "")}</li>;
            // Horizontal rule
            if (/^---+$/.test(line.trim())) return <hr key={i} className="my-6 border-gray-200" />;
            // Empty line
            if (!line.trim()) return <div key={i} className="h-3" />;
            // Paragraph
            return <p key={i} className="text-gray-700 leading-relaxed my-1">{line}</p>;
          })}
        </div>

        {/* Footer meta */}
        <div className="mt-10 pt-6 border-t border-gray-200 text-xs text-gray-400 space-y-1">
          <p>来源：{entry.source}{entry.source_url && ` (${entry.source_url})`}</p>
          <p>抓取时间：{formatDate(entry.fetched)}</p>
          {entry.link && (
            <p>
              原文链接：
              <a href={entry.link} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-600">
                {entry.link}
              </a>
            </p>
          )}
          <p>
            分享链接：
            <button
              onClick={() => navigator.clipboard.writeText(shareUrl)}
              className="text-indigo-400 hover:text-indigo-600 cursor-pointer underline"
            >
              复制链接
            </button>
          </p>
        </div>
      </article>
    </div>
  );
}
