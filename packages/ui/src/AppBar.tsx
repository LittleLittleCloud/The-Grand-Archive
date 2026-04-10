import type { User } from "@dak/contract";
import { useTranslation } from "react-i18next";

export function AppBar({
  user,
  onLogout,
}: {
  user: User | null;
  onLogout: () => void;
}) {
  const { t, i18n } = useTranslation();

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language.startsWith("zh") ? "en" : "zh");
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "rgba(4, 25, 38, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Left: brand + nav */}
        <div className="flex items-center gap-8">
          <a
            href="#/"
            className="font-display text-lg font-bold text-gold hover:opacity-80 transition-opacity"
            style={{ fontFamily: "var(--font-display)" }}
          >
            THE GRAND ARCHIVE
          </a>
          <nav className="hidden sm:flex items-center gap-6">
            <NavLink href="#/">{t("nav.home")}</NavLink>
            <NavLink href="#/search">{t("nav.search")}</NavLink>
          </nav>
        </div>

        {/* Right: lang + auth */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleLang}
            className="text-sm text-on-primary/60 hover:text-on-primary transition-colors cursor-pointer"
            style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em", fontSize: "0.75rem" }}
          >
            {i18n.language.startsWith("zh") ? "EN" : "中文"}
          </button>
          {user ? (
            <>
              <NavLink href="#/api-keys">{t("nav.apiKeys")}</NavLink>
              <span
                className="text-sm text-on-primary/60"
                style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em" }}
              >
                {user.username}
              </span>
              <button
                onClick={onLogout}
                className="text-sm text-on-primary/60 hover:text-on-primary transition-colors cursor-pointer"
                style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em" }}
              >
                {t("nav.signOut")}
              </button>
            </>
          ) : (
            <a
              href="#/login"
              className="px-4 py-1.5 bg-on-primary text-primary text-sm font-medium hover:bg-on-primary/90 transition-colors"
              style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em" }}
            >
              {t("nav.signIn")}
            </a>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children, external }: { href: string; children: React.ReactNode; external?: boolean }) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="text-sm text-on-primary/70 hover:text-on-primary transition-colors uppercase"
      style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em", fontSize: "0.75rem" }}
    >
      {children}
    </a>
  );
}
