import { useState } from "react";
import { requestPasswordReset } from "./auth-client";
import { handleLinkClick } from "./router";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (authError) {
        setError(authError.message ?? "Failed to send reset email");
      } else {
        setSent(true);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="bg-surface-low p-8" style={{ boxShadow: "var(--shadow-whisper)" }}>
            <h2 className="font-display text-2xl font-bold text-primary text-center mb-4 tracking-tight">
              Check your email
            </h2>
            <p className="font-body text-sm text-on-surface-variant text-center leading-relaxed">
              If an account exists for <span className="text-on-surface font-medium">{email}</span>,
              we sent a password reset link. Please check your inbox.
            </p>
          </div>
          <p className="mt-6 text-center font-label text-xs tracking-wide text-on-surface-variant">
            <a href="/login" onClick={handleLinkClick} className="text-secondary underline underline-offset-2 hover:text-primary">
              &larr; Back to sign in
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-surface-low p-8" style={{ boxShadow: "var(--shadow-whisper)" }}>
          <h2 className="font-display text-3xl font-bold text-primary text-center mb-4 tracking-tight">
            Forgot password
          </h2>
          <p className="font-body text-sm text-on-surface-variant text-center mb-8 leading-relaxed">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>

          {error && (
            <div className="mb-6 p-3 bg-surface-high text-on-surface text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block font-label text-xs tracking-widest text-on-surface-variant uppercase mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b border-outline/30 focus:border-primary py-2 text-on-surface font-body outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-on-primary font-label text-sm font-semibold tracking-widest uppercase transition hover:bg-primary-container disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center font-label text-xs tracking-wide text-on-surface-variant">
          <a href="/login" onClick={handleLinkClick} className="text-secondary underline underline-offset-2 hover:text-primary">
            &larr; Back to sign in
          </a>
        </p>
      </div>
    </div>
  );
}
