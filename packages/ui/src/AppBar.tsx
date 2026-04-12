import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

export function AppBar({
  user,
  onLogout,
}: {
  user: { name: string; username?: string | null; image?: string | null } | null;
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
            <NavLink href="#/feeds">{t("nav.feeds")}</NavLink>
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
            <ProfileMenu user={user} onLogout={onLogout} />
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

function ProfileMenu({
  user,
  onLogout,
}: {
  user: { name: string; username?: string | null; image?: string | null };
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const displayName = user.username ?? user.name;
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 cursor-pointer group"
      >
        {user.image ? (
          <img
            src={user.image}
            alt={displayName}
            className="w-8 h-8 object-cover"
            style={{ borderRadius: 0 }}
          />
        ) : (
          <div
            className="w-8 h-8 flex items-center justify-center bg-on-primary/20 text-on-primary text-sm font-bold"
            style={{ fontFamily: "var(--font-label)" }}
          >
            {initials}
          </div>
        )}
        <svg
          className={`w-3 h-3 text-on-primary/60 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="square" strokeLinejoin="miter" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-48 py-1 bg-surface-low text-on-surface z-50"
          style={{ boxShadow: "var(--shadow-whisper)" }}
        >
          <div
            className="px-4 py-2 text-xs text-on-surface-variant uppercase truncate"
            style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em" }}
          >
            {displayName}
          </div>
          <div className="h-px bg-outline/15 mx-2" />
          <DropdownLink href="#/api-keys" onClick={() => setOpen(false)}>
            {t("nav.apiKeys")}
          </DropdownLink>
          <DropdownLink href="#/settings" onClick={() => setOpen(false)}>
            {t("nav.settings", "Settings")}
          </DropdownLink>
          <div className="h-px bg-outline/15 mx-2" />
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-surface-high transition-colors cursor-pointer"
            style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em", fontSize: "0.75rem" }}
          >
            {t("nav.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}

function DropdownLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="block px-4 py-2 text-sm hover:bg-surface-high transition-colors"
      style={{ fontFamily: "var(--font-label)", letterSpacing: "0.05em", fontSize: "0.75rem" }}
    >
      {children}
    </a>
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
