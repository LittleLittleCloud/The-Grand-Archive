import { useState } from "react";
import { resetPassword } from "./auth-client";

export function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Token comes from ?token=xxx in the URL (Better Auth redirects here)
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const tokenError = params.get("error");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim() || password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await resetPassword({
        newPassword: password,
        token,
      });
      if (authError) {
        setError(authError.message ?? "Failed to reset password");
      } else {
        setDone(true);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="bg-surface-low p-8" style={{ boxShadow: "var(--shadow-whisper)" }}>
            <h2 className="font-display text-2xl font-bold text-primary text-center mb-4 tracking-tight">
              Password reset
            </h2>
            <p className="font-body text-sm text-on-surface-variant text-center leading-relaxed">
              Your password has been updated. You can now sign in with your new password.
            </p>
          </div>
          <p className="mt-6 text-center font-label text-xs tracking-wide text-on-surface-variant">
            <a href="#/login" className="text-secondary underline underline-offset-2 hover:text-primary">
              Sign in &rarr;
            </a>
          </p>
        </div>
      </div>
    );
  }

  if (tokenError || !token) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="bg-surface-low p-8" style={{ boxShadow: "var(--shadow-whisper)" }}>
            <h2 className="font-display text-2xl font-bold text-primary text-center mb-4 tracking-tight">
              Invalid or expired link
            </h2>
            <p className="font-body text-sm text-on-surface-variant text-center leading-relaxed">
              This password reset link is no longer valid. Please request a new one.
            </p>
          </div>
          <p className="mt-6 text-center font-label text-xs tracking-wide text-on-surface-variant">
            <a href="#/forgot-password" className="text-secondary underline underline-offset-2 hover:text-primary">
              Request new link &rarr;
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
          <h2 className="font-display text-3xl font-bold text-primary text-center mb-8 tracking-tight">
            Set new password
          </h2>

          {error && (
            <div className="mb-6 p-3 bg-surface-high text-on-surface text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="password"
                className="block font-label text-xs tracking-widest text-on-surface-variant uppercase mb-2"
              >
                New password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-b border-outline/30 focus:border-primary py-2 text-on-surface font-body outline-none transition"
              />
            </div>

            <div>
              <label
                htmlFor="confirm"
                className="block font-label text-xs tracking-widest text-on-surface-variant uppercase mb-2"
              >
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-transparent border-b border-outline/30 focus:border-primary py-2 text-on-surface font-body outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-on-primary font-label text-sm font-semibold tracking-widest uppercase transition hover:bg-primary-container disabled:opacity-50"
            >
              {loading ? "Resetting…" : "Reset password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
