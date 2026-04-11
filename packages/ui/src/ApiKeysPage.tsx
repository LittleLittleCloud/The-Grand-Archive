import { useEffect, useState } from "react";
import { api, ApiError } from "./api";
import type { ApiKey } from "@dak/contract";

export function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    setLoading(true);
    try {
      const data = await api.listApiKeys();
      setKeys(data);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        window.location.hash = "#/login";
        return;
      }
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      const result = await api.createApiKey(newKeyName.trim());
      setCreatedKey(result.key);
      setCopied(false);
      setNewKeyName("");
      await loadKeys();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await api.deleteApiKey(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(null);
    }
  }

  function handleCopy() {
    if (!createdKey) return;
    navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-surface pt-14">
      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1
          className="text-3xl font-bold text-primary mb-2 tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          API Keys
        </h1>
        <p
          className="text-on-surface-variant mb-10"
          style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em", fontSize: "0.75rem" }}
        >
          MANAGE PROGRAMMATIC ACCESS TO THE ARCHIVE
        </p>

        {error && (
          <div
            className="mb-6 px-4 py-3 bg-surface-high text-on-surface text-sm"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {error}
          </div>
        )}

        {/* Create new key */}
        <section className="mb-10">
          <p
            className="text-on-surface-variant uppercase mb-3"
            style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em", fontSize: "0.75rem" }}
          >
            Create a new key
          </p>
          <div className="bg-surface-low p-6" style={{ boxShadow: "var(--shadow-whisper)" }}>
            <form onSubmit={handleCreate} className="flex gap-3">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g. ingestion-worker)"
                className="flex-1 bg-transparent border-b border-outline/30 focus:border-primary py-2 text-on-surface text-sm outline-none transition"
                style={{ fontFamily: "var(--font-body)" }}
              />
              <button
                type="submit"
                className="px-5 py-2 bg-primary text-on-primary text-sm font-semibold uppercase tracking-widest transition hover:bg-primary-container cursor-pointer"
                style={{ fontFamily: "var(--font-label)" }}
              >
                Create
              </button>
            </form>

            {createdKey && (
              <div className="mt-5 p-4 bg-surface-high">
                <p
                  className="text-on-surface-variant uppercase mb-2"
                  style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em", fontSize: "0.7rem" }}
                >
                  Copy this key now — it won&apos;t be shown again
                </p>
                <code
                  className="block text-sm bg-surface-dim px-3 py-2 font-mono break-all select-all text-on-surface"
                >
                  {createdKey}
                </code>
                <button
                  onClick={handleCopy}
                  className="mt-2 text-secondary underline underline-offset-2 hover:text-primary transition-colors cursor-pointer"
                  style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em", fontSize: "0.75rem" }}
                >
                  {copied ? "Copied" : "Copy to clipboard"}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Key list */}
        <section>
          <p
            className="text-on-surface-variant uppercase mb-3"
            style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em", fontSize: "0.75rem" }}
          >
            Your keys
          </p>
          <div className="bg-surface-low" style={{ boxShadow: "var(--shadow-whisper)" }}>
            {loading ? (
              <p
                className="px-6 py-10 text-on-surface-variant text-center text-sm"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Loading…
              </p>
            ) : keys.length === 0 ? (
              <p
                className="px-6 py-10 text-on-surface-variant text-center text-sm"
                style={{ fontFamily: "var(--font-body)" }}
              >
                No API keys yet. Create one above.
              </p>
            ) : (
              <ul>
                {keys.map((k, i) => (
                  <li
                    key={k.id}
                    className={`px-6 py-4 flex items-center justify-between transition-colors ${
                      i % 2 === 0 ? "bg-surface-low" : "bg-surface"
                    }`}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "var(--color-surface-container-lowest)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "")
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="font-medium text-on-surface text-sm"
                        style={{ fontFamily: "var(--font-body)" }}
                      >
                        {k.name}
                      </p>
                      <p
                        className="text-on-surface-variant mt-0.5"
                        style={{
                          fontFamily: "var(--font-label)",
                          letterSpacing: "0.05em",
                          fontSize: "0.7rem",
                        }}
                      >
                        <span className="font-mono">{k.prefix}…</span>
                        {" · "}
                        Created {k.created_at.slice(0, 10)}
                        {k.last_used && (
                          <>
                            {" · "}
                            Last used {k.last_used.slice(0, 10)}
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(k.id)}
                      disabled={deleting === k.id}
                      className="text-secondary hover:text-primary transition-colors cursor-pointer disabled:opacity-40"
                      style={{
                        fontFamily: "var(--font-label)",
                        letterSpacing: "0.05em",
                        fontSize: "0.75rem",
                      }}
                    >
                      {deleting === k.id ? "Deleting…" : "Delete"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
