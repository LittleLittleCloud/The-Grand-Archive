import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "./api";
import type { SearchResponse, User } from "@dak/contract";
import { LandingPage } from "./LandingPage";
import { LoginPage } from "./LoginPage";
import { SignUpPage } from "./SignUpPage";
import { ApiKeysPage } from "./ApiKeysPage";
import { AppBar } from "./AppBar";

function useHash() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  return hash;
}

export function App() {
  const hash = useHash();
  const [user, setUser] = useState<User | null>(null);

  const fetchUser = useCallback(() => {
    api.getMe().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    fetchUser();
    const onAuthChange = () => fetchUser();
    window.addEventListener("auth-change", onAuthChange);
    return () => window.removeEventListener("auth-change", onAuthChange);
  }, [fetchUser]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
    }
    setUser(null);
    window.location.hash = "#/";
  };

  if (hash === "#/login") {
    return <LoginPage />;
  }

  if (hash === "#/signup") {
    return <SignUpPage />;
  }

  const page = (() => {
    if (hash === "#/search") return <SearchPage />;
    if (hash === "#/api-keys") return <ApiKeysPage />;
    return <LandingPage />;
  })();

  return (
    <>
      <AppBar user={user} onLogout={handleLogout} />
      {page}
    </>
  );
}

function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const data = await api.search({ q: query });
      setResults(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entries..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "..." : "Search"}
          </button>
        </form>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {results && (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              {results.total} results for &ldquo;{results.query}&rdquo;
            </p>
            <ul className="space-y-3">
              {results.results.map((r) => (
                <li
                  key={r.id}
                  className="p-4 bg-white rounded-lg border hover:shadow-sm"
                >
                  <h3 className="font-medium text-gray-900">{r.title}</h3>
                  <div className="mt-1 text-sm text-gray-500 flex gap-3">
                    <span>{r.category}</span>
                    <span>{r.source}</span>
                    <span>{r.published.slice(0, 10)}</span>
                    <span className="text-gray-400">
                      score: {r.score.toFixed(1)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
