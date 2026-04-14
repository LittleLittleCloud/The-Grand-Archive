import { useState, useEffect } from "react";
import { LandingPage } from "./LandingPage";
import { LoginPage } from "./LoginPage";
import { SignUpPage } from "./SignUpPage";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { ResetPasswordPage } from "./ResetPasswordPage";
import { VerifyEmailPage } from "./VerifyEmailPage";
import { ApiKeysPage } from "./ApiKeysPage";
import { SettingsPage } from "./SettingsPage";
import { FeedsPage } from "./FeedsPage";
import { SearchPage } from "./SearchPage";
import { EntryPage } from "./EntryPage";
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
    if (hash.startsWith("#/entry/")) return <EntryPage />;
    if (hash === "#/feeds") return <FeedsPage />;
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
