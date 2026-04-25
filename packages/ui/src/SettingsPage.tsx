import { useEffect, useState } from "react";
import { useSession, authClient } from "./auth-client";
import { api, ApiError } from "./api";
import type { ApiKey } from "@dak/contract";
import { navigate } from "./router";

export function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user;

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-surface pt-14">
      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1
          className="font-display text-3xl font-bold text-primary mb-10 tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Settings
        </h1>

        <ProfileSection user={user} />
        <div className="mt-10" />
        <ApiKeysSection />
      </main>
    </div>
  );
}

/* ─── Profile Section ─── */

function ProfileSection({
  user,
}: {
  user: { id: string; name: string; email: string; image?: string | null; username?: string | null };
}) {
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name === user.name) return;
    setSaving(true);
    setSaved(false);
    try {
      await authClient.updateUser({ name: name.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2
        className="font-display text-xl font-bold text-primary mb-6"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Profile
      </h2>

      <div className="bg-surface-low p-6" style={{ boxShadow: "var(--shadow-whisper)" }}>
        {/* Avatar + info */}
        <div className="flex items-start gap-5 mb-6">
          {user.image ? (
            <img src={user.image} alt={user.name} className="w-16 h-16 object-cover" />
          ) : (
            <div
              className="w-16 h-16 flex items-center justify-center bg-primary text-on-primary text-xl font-bold"
              style={{ fontFamily: "var(--font-label)" }}
            >
              {(user.username ?? user.name).charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p
              className="text-xs text-on-surface-variant uppercase mb-1"
              style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em" }}
            >
              Username
            </p>
            <p className="text-on-surface font-medium" style={{ fontFamily: "var(--font-body)" }}>
              {user.username ?? "—"}
            </p>
            <p
              className="text-xs text-on-surface-variant uppercase mt-3 mb-1"
              style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em" }}
            >
              Email
            </p>
            <p className="text-on-surface" style={{ fontFamily: "var(--font-body)" }}>
              {user.email}
            </p>
          </div>
        </div>

        {/* Editable name */}
        <form onSubmit={handleSave} className="flex items-end gap-3">
          <div className="flex-1">
            <label
              htmlFor="display-name"
              className="block text-xs text-on-surface-variant uppercase mb-2"
              style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em" }}
            >
              Display name
            </label>
            <input
              id="display-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent border-b border-outline/30 focus:border-primary py-2 text-on-surface outline-none transition"
              style={{ fontFamily: "var(--font-body)" }}
            />
          </div>
          <button
            type="submit"
            disabled={saving || name === user.name}
            className="px-5 py-2 bg-primary text-on-primary text-sm font-semibold uppercase tracking-widest transition hover:bg-primary-container disabled:opacity-40"
            style={{ fontFamily: "var(--font-label)" }}
          >
            {saving ? "Saving…" : saved ? "Saved" : "Save"}
          </button>
        </form>
      </div>
    </section>
  );
}

/* ─── API Keys Section ─── */

function ApiKeysSection() {
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
        navigate("/login");
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
    <section>
      <h2
        className="font-display text-xl font-bold text-primary mb-6"
        style={{ fontFamily: "var(--font-display)" }}
      >
        API Keys
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-surface-high text-on-surface text-sm">
          {error}
        </div>
      )}

      {/* Create key */}
      <div className="bg-surface-low p-6 mb-6" style={{ boxShadow: "var(--shadow-whisper)" }}>
        <p
          className="text-xs text-on-surface-variant uppercase mb-3"
          style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em" }}
        >
          Create a new key
        </p>
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
            className="px-5 py-2 bg-primary text-on-primary text-sm font-semibold uppercase tracking-widest transition hover:bg-primary-container"
            style={{ fontFamily: "var(--font-label)" }}
          >
            Create
          </button>
        </form>

        {createdKey && (
          <div className="mt-4 p-4 bg-surface-high">
            <p
              className="text-xs text-on-surface-variant uppercase mb-2"
              style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em" }}
            >
              Copy this key now — it won&apos;t be shown again
            </p>
            <code
              className="block text-sm bg-surface-dim px-3 py-2 font-mono break-all select-all text-on-surface"
            >
              {createdKey}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(createdKey)}
              className="mt-2 text-xs text-secondary underline underline-offset-2 hover:text-primary cursor-pointer"
              style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em" }}
            >
              Copy to clipboard
            </button>
          </div>
        )}
      </div>

      {/* Key list */}
      <div className="bg-surface-low" style={{ boxShadow: "var(--shadow-whisper)" }}>
        <div className="px-6 py-4">
          <p
            className="text-xs text-on-surface-variant uppercase"
            style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em" }}
          >
            Your keys
          </p>
        </div>

        {loading ? (
          <p className="px-6 py-8 text-on-surface-variant text-center text-sm">Loading…</p>
        ) : keys.length === 0 ? (
          <p className="px-6 py-8 text-on-surface-variant text-center text-sm">
            No API keys yet. Create one above.
          </p>
        ) : (
          <ul>
            {keys.map((k, i) => (
              <li
                key={k.id}
                className={`px-6 py-4 flex items-center justify-between ${i % 2 === 0 ? "bg-surface-low" : "bg-surface"}`}
              >
                <div>
                  <p className="font-medium text-on-surface text-sm" style={{ fontFamily: "var(--font-body)" }}>
                    {k.name}
                  </p>
                  <p
                    className="text-on-surface-variant mt-0.5"
                    style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em", fontSize: "0.7rem" }}
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
                  className="text-sm text-secondary hover:text-primary transition-colors cursor-pointer"
                  style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em", fontSize: "0.75rem" }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
