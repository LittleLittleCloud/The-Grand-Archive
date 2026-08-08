import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { UserDigestSummary, DigestLang, UserDigest } from "@dak/contract";
import { api, ApiError } from "./api";
import { useSession } from "./auth-client";
import { handleLinkClick } from "./router";

const EXAMPLE_JSON = `{
  "title": "My Front Page",
  "subtitle": "An optional deck",
  "standfirst": "A one-paragraph lead framing the day.",
  "highlights": ["First takeaway", "Second takeaway"],
  "quote": null,
  "sections": [
    {
      "heading": "World",
      "body": null,
      "items": [
        { "text": "Your attributed point.", "source": "Reuters", "url": "https://example.com", "entryId": null }
      ]
    }
  ],
  "footerNote": null
}`;

export function MyDigestsPage() {
  const { t } = useTranslation();
  const { data: session, isPending } = useSession();
  const user = session?.user ?? null;

  const [digests, setDigests] = useState<UserDigestSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lang, setLang] = useState<DigestLang>("en");
  const [date, setDate] = useState("");
  const [jsonText, setJsonText] = useState(EXAMPLE_JSON);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    setLoading(true);
    api
      .listUserDigests()
      .then((r) => setDigests(r.digests))
      .catch(() => setDigests([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user) refresh();
    else setLoading(false);
  }, [user]);

  const openCreate = () => {
    setEditingId(null);
    setLang("en");
    setDate("");
    setJsonText(EXAMPLE_JSON);
    setError(null);
    setEditorOpen(true);
  };

  const openEdit = async (id: string) => {
    setError(null);
    try {
      const d: UserDigest = await api.getUserDigest(id);
      setEditingId(d.id);
      setLang(d.lang);
      setDate(d.date);
      setJsonText(JSON.stringify(d.content, null, 2));
      setEditorOpen(true);
    } catch {
      setError(t("myDigests.couldNotLoad"));
    }
  };

  const submit = async () => {
    setError(null);
    let content: unknown;
    try {
      content = JSON.parse(jsonText);
    } catch {
      setError(t("myDigests.invalidJson"));
      return;
    }
    setBusy(true);
    try {
      if (editingId) {
        await api.updateUserDigest(editingId, {
          lang,
          date: date || undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content: content as any,
        });
      } else {
        await api.createUserDigest({
          lang,
          date: date || undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content: content as any,
        });
      }
      setEditorOpen(false);
      refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? `${err.message}${err.status === 400 ? t("myDigests.schemaHint") : ""}`
          : t("myDigests.genericError")
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleShare = async (d: UserDigestSummary) => {
    try {
      await api.shareUserDigest(d.id, d.visibility === "public" ? "private" : "public");
      refresh();
    } catch {
      /* ignore */
    }
  };

  const remove = async (d: UserDigestSummary) => {
    if (!confirm(t("myDigests.deleteConfirm", { title: d.title }))) return;
    try {
      await api.deleteUserDigest(d.id);
      refresh();
    } catch {
      /* ignore */
    }
  };

  const copyLink = (shareId: string) => {
    const url = `${window.location.origin}/d/${shareId}`;
    navigator.clipboard?.writeText(url);
  };

  if (isPending) return null;

  if (!user) {
    return (
      <div className="bg-surface min-h-screen">
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <p className="text-on-surface-variant mb-6" style={{ fontFamily: "var(--font-body)" }}>
            {t("myDigests.signInPrompt")}
          </p>
          <a
            href="/login"
            onClick={handleLinkClick}
            className="inline-block px-5 py-2 bg-primary text-on-primary"
            style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em" }}
          >
            {t("myDigests.signIn")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-14 pt-20">
        <div className="flex items-center justify-between mb-8">
          <h1
            className="text-on-surface"
            style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700 }}
          >
            {t("myDigests.title")}
          </h1>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-primary text-on-primary cursor-pointer"
            style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em", fontSize: "0.85rem" }}
          >
            {t("myDigests.new")}
          </button>
        </div>

        <p
          className="mb-8 text-on-surface-variant"
          style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", lineHeight: 1.6 }}
        >
          {t("myDigests.intro")}{" "}
          {t("myDigests.formatDocs")}{" "}
          <a href="/api/digests/schema" className="underline" style={{ color: "var(--color-secondary, #6f5a44)" }}>
            /api/digests/schema
          </a>{" "}
          ·{" "}
          <a href="/openapi.json" className="underline" style={{ color: "var(--color-secondary, #6f5a44)" }}>
            /openapi.json
          </a>
        </p>

        {loading ? (
          <p className="text-on-surface-variant" style={{ fontFamily: "var(--font-body)" }}>
            {t("myDigests.loading")}
          </p>
        ) : digests.length === 0 ? (
          <p className="text-on-surface-variant" style={{ fontFamily: "var(--font-body)" }}>
            {t("myDigests.empty")}
          </p>
        ) : (
          <ul className="space-y-3">
            {digests.map((d) => (
              <li
                key={d.id}
                className="p-4"
                style={{ border: "1px solid var(--color-outline, #d8d2c4)", background: "var(--color-surface-low, #fcf9f2)" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div
                      className="text-on-surface truncate"
                      style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 600 }}
                    >
                      {d.title}
                    </div>
                    <div
                      className="mt-1 text-on-surface-variant"
                      style={{ fontFamily: "var(--font-label)", fontSize: "0.72rem", letterSpacing: "0.06em" }}
                    >
                      {d.date} · {d.lang === "zh" ? "中文" : "EN"} ·{" "}
                      <span style={{ color: d.visibility === "public" ? "#b8860b" : "#4e6073" }}>
                        {d.visibility === "public" ? t("myDigests.public") : t("myDigests.private")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <ActionBtn onClick={() => toggleShare(d)}>
                    {d.visibility === "public" ? t("myDigests.unpublish") : t("myDigests.share")}
                  </ActionBtn>
                  {d.visibility === "public" && (
                    <>
                      <ActionBtn onClick={() => copyLink(d.shareId)}>{t("myDigests.copyLink")}</ActionBtn>
                      <a
                        href={`/d/${d.shareId}`}
                        onClick={handleLinkClick}
                        className="text-sm underline"
                        style={{ fontFamily: "var(--font-label)", fontSize: "0.78rem", color: "#6f5a44" }}
                      >
                        {t("myDigests.view")}
                      </a>
                    </>
                  )}
                  <ActionBtn onClick={() => openEdit(d.id)}>{t("myDigests.edit")}</ActionBtn>
                  <ActionBtn onClick={() => remove(d)} danger>
                    {t("myDigests.delete")}
                  </ActionBtn>
                </div>
              </li>
            ))}
          </ul>
        )}

        {editorOpen && (
          <div className="mt-10 p-5" style={{ border: "2px solid #041926", background: "#fcf9f2" }}>
            <h2
              className="text-on-surface mb-4"
              style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", fontWeight: 700 }}
            >
              {editingId ? t("myDigests.editTitle") : t("myDigests.newTitle")}
            </h2>

            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <label className="flex items-center gap-2" style={{ fontFamily: "var(--font-label)", fontSize: "0.8rem" }}>
                {t("myDigests.language")}
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as DigestLang)}
                  className="px-2 py-1"
                  style={{ border: "1px solid #d8d2c4", background: "#fff" }}
                >
                  <option value="en">English</option>
                  <option value="zh">中文</option>
                </select>
              </label>
              <label className="flex items-center gap-2" style={{ fontFamily: "var(--font-label)", fontSize: "0.8rem" }}>
                {t("myDigests.date")}
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="px-2 py-1"
                  style={{ border: "1px solid #d8d2c4", background: "#fff" }}
                />
              </label>
            </div>

            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              spellCheck={false}
              rows={16}
              className="w-full p-3"
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "0.8rem",
                border: "1px solid #d8d2c4",
                background: "#fff",
                color: "#1a2e3b",
              }}
            />

            {error && (
              <p className="mt-3" style={{ color: "#a12", fontFamily: "var(--font-body)", fontSize: "0.85rem" }}>
                {error}
              </p>
            )}

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={submit}
                disabled={busy}
                className="px-4 py-2 bg-primary text-on-primary cursor-pointer disabled:opacity-60"
                style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em", fontSize: "0.85rem" }}
              >
                {busy ? t("myDigests.saving") : editingId ? t("myDigests.save") : t("myDigests.publish")}
              </button>
              <button
                onClick={() => setEditorOpen(false)}
                className="px-4 py-2 cursor-pointer"
                style={{
                  border: "1px solid #041926",
                  color: "#041926",
                  fontFamily: "var(--font-label)",
                  fontSize: "0.85rem",
                }}
              >
                {t("myDigests.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({
  onClick,
  children,
  danger,
}: {
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="cursor-pointer"
      style={{
        fontFamily: "var(--font-label)",
        fontSize: "0.78rem",
        letterSpacing: "0.04em",
        color: danger ? "#a12" : "#6f5a44",
        textDecoration: "underline",
      }}
    >
      {children}
    </button>
  );
}
