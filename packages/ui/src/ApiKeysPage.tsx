import { useEffect, useState } from "react";
import { api, ApiError } from "./api";
import type { ApiKey } from "@dak/contract";

export function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setNewKeyName("");
      await loadKeys();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteApiKey(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">API Keys</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* Create new key */}
        <div className="bg-white rounded-xl border p-6 shadow-sm mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">
            Create a new API key
          </h2>
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g. ingestion-worker)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
            >
              Create
            </button>
          </form>

          {createdKey && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800 mb-1">
                Key created — copy it now, it won&apos;t be shown again:
              </p>
              <code className="block text-sm bg-green-100 px-3 py-2 rounded font-mono break-all select-all">
                {createdKey}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdKey);
                }}
                className="mt-2 text-xs text-green-700 hover:text-green-900 underline"
              >
                Copy to clipboard
              </button>
            </div>
          )}
        </div>

        {/* Key list */}
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold text-gray-900">Your API keys</h2>
          </div>

          {loading ? (
            <p className="px-6 py-8 text-gray-400 text-center">Loading…</p>
          ) : keys.length === 0 ? (
            <p className="px-6 py-8 text-gray-400 text-center text-sm">
              No API keys yet. Create one above.
            </p>
          ) : (
            <ul className="divide-y">
              {keys.map((k) => (
                <li
                  key={k.id}
                  className="px-6 py-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {k.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
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
                    className="text-sm text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded-lg transition"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
