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
import { usePath, navigate } from "./router";

export function App() {
  const path = usePath();
  const { data: session } = useSession();
  const user = session?.user ?? null;

  const handleLogout = async () => {
    await signOut();
    navigate("/");
    window.location.reload();
  };

  if (path === "/login") {
    return <LoginPage />;
  }

  if (path === "/signup") {
    return <SignUpPage />;
  }

  if (path === "/forgot-password") {
    return <ForgotPasswordPage />;
  }

  if (path === "/reset-password") {
    return <ResetPasswordPage />;
  }

  if (path === "/verify-email") {
    return <VerifyEmailPage />;
  }

  const page = (() => {
    if (path === "/search") return <SearchPage />;
    if (path.startsWith("/entry/")) return <EntryPage />;
    if (path === "/feeds") return <FeedsPage />;
    if (path === "/api-keys") return <ApiKeysPage />;
    if (path === "/settings") return <SettingsPage />;
    return <LandingPage />;
  })();

  return (
    <>
      <AppBar user={user} onLogout={handleLogout} />
      {page}
    </>
  );
}
