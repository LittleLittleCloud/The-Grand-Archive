import { useState, useEffect } from "react";
import { api } from "./api";
import type { SearchResponse } from "@dak/contract";
import { LandingPage } from "./LandingPage";
import { LoginPage } from "./LoginPage";
import { SignUpPage } from "./SignUpPage";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { ResetPasswordPage } from "./ResetPasswordPage";
import { VerifyEmailPage } from "./VerifyEmailPage";
import { ApiKeysPage } from "./ApiKeysPage";
import { SettingsPage } from "./SettingsPage";
import { AppBar } from "./AppBar";
import { useSession, signOut } from "./auth-client";

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
  const { data: session } = useSession();
  const user = session?.user ?? null;

  const handleLogout = async () => {
    await signOut();
    window.location.hash = "#/";
    window.location.reload();
  };

  if (hash === "#/login") {
    return <LoginPage />;
  }

  if (hash === "#/signup") {
    return <SignUpPage />;
  }

  if (hash === "#/forgot-password") {
    return <ForgotPasswordPage />;
  }

  if (hash === "#/reset-password") {
    return <ResetPasswordPage />;
  }

  if (hash === "#/verify-email") {
    return <VerifyEmailPage />;
  }

  const page = (() => {
    if (hash === "#/search") return <SearchPage />;
    if (hash === "#/api-keys") return <ApiKeysPage />;
    if (hash === "#/settings") return <SettingsPage />;
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
    <div className="min-h-screen bg-surface pt-14">
      <main className="max-w-4xl mx-auto px-6 py-10">
        <form onSubmit={handleSearch} className="flex gap-3 mb-10">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entries..."
            className="flex-1 px-0 py-2 bg-transparent text-on-surface placeholder-on-surface-variant/50 focus:outline-none"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "1rem",
              borderBottom: "1px solid rgba(115,119,124,0.3)",
            }}
            onFocus={(e) => (e.target.style.borderBottom = "2px solid #041926")}
            onBlur={(e) => (e.target.style.borderBottom = "1px solid rgba(115,119,124,0.3)")}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary text-on-primary font-medium hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
            style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em", fontSize: "0.85rem" }}
          >
            {loading ? "..." : "Search"}
          </button>
        </form>

        {error && (
          <div className="mb-6 p-4 bg-surface-low text-on-surface">
            {error}
          </div>
        )}

        {results && (
          <div>
            <p
              className="text-on-surface-variant mb-6"
              style={{ fontFamily: "var(--font-label)", fontSize: "0.75rem", letterSpacing: "0.05em" }}
            >
              {results.total} RESULTS FOR &ldquo;{results.query}&rdquo;
            </p>
            <ul className="space-y-0">
              {results.results.map((r, i) => (
                <li
                  key={r.id}
                  className="py-5 px-6 transition-colors hover:bg-surface-low"
                  style={{
                    background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-container-low)",
                  }}
                >
                  <h3
                    className="text-on-surface"
                    style={{ fontFamily: "var(--font-body)", fontSize: "1rem", fontWeight: 500 }}
                  >
                    {r.title}
                  </h3>
                  <div
                    className="mt-2 flex flex-wrap gap-4 text-on-surface-variant"
                    style={{ fontFamily: "var(--font-label)", fontSize: "0.75rem", letterSpacing: "0.05em" }}
                  >
                    <span>{r.category}</span>
                    <span>{r.source}</span>
                    <span>{r.published.slice(0, 10)}</span>
                    <span style={{ color: "var(--color-outline)" }}>
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
