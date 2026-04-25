import { useEffect, useState } from "react";
import { sendVerificationEmail } from "./auth-client";
import { navigate, handleLinkClick } from "./router";

export function VerifyEmailPage() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");
  const email = params.get("email") ?? "";
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  // If no error param, the verification succeeded — Better Auth already set the cookie
  const success = !error;

  useEffect(() => {
    if (success) {
      // Auto-redirect after a brief pause
      const t = setTimeout(() => { navigate("/"); }, 2000);
      return () => clearTimeout(t);
    }
  }, [success]);

  async function handleResend() {
    if (!email) return;
    setResending(true);
    try {
      await sendVerificationEmail({ email, callbackURL: "/" });
      setResent(true);
    } finally {
      setResending(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="bg-surface-low p-8" style={{ boxShadow: "var(--shadow-whisper)" }}>
            <h2 className="font-display text-2xl font-bold text-primary text-center mb-4 tracking-tight">
              Email verified
            </h2>
            <p className="font-body text-sm text-on-surface-variant text-center leading-relaxed">
              Your email has been verified. Redirecting&hellip;
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-surface-low p-8" style={{ boxShadow: "var(--shadow-whisper)" }}>
          <h2 className="font-display text-2xl font-bold text-primary text-center mb-4 tracking-tight">
            Verification failed
          </h2>
          <p className="font-body text-sm text-on-surface-variant text-center leading-relaxed mb-6">
            The verification link is invalid or expired.
            {email && !resent && " Click below to get a new one."}
          </p>

          {email && !resent && (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full py-2.5 bg-primary text-on-primary font-label text-sm font-semibold tracking-widest uppercase transition hover:bg-primary-container disabled:opacity-50"
            >
              {resending ? "Sending…" : "Resend verification email"}
            </button>
          )}

          {resent && (
            <p className="font-body text-sm text-on-surface-variant text-center">
              A new verification link has been sent to <span className="text-on-surface font-medium">{email}</span>.
            </p>
          )}
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
