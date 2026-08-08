import { useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Social-media share bar for a public digest. Uses the native Web Share sheet
 * when available, plus explicit intent links for the major platforms and a
 * copy-to-clipboard fallback. No third-party SDKs — all plain share URLs.
 */
export function ShareBar({ url, title }: { url: string; title: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const targets: { key: string; label: string; href: string }[] = [
    {
      key: "x",
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    },
    {
      key: "weibo",
      label: "微博",
      href: `http://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
    },
    {
      key: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
    {
      key: "telegram",
      label: "Telegram",
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      href: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${title} ${url}`)}`,
    },
    {
      key: "email",
      label: "Email",
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
    },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title, url });
    } catch {
      /* user cancelled or unsupported */
    }
  };

  return (
    <div
      className="flex items-center justify-center gap-x-3 gap-y-2 flex-wrap py-3 mb-6"
      style={{ borderBottom: "1px solid #d8d2c4" }}
    >
      <span
        style={{
          fontFamily: "var(--font-label)",
          fontSize: "0.68rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#4e6073",
        }}
      >
        {t("userDigest.share")}
      </span>

      {canNativeShare && (
        <button onClick={nativeShare} style={linkStyle} className="cursor-pointer">
          {t("userDigest.shareNative")}
        </button>
      )}

      {targets.map((tg) => (
        <a
          key={tg.key}
          href={tg.href}
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
        >
          {tg.label}
        </a>
      ))}

      <button onClick={copy} style={linkStyle} className="cursor-pointer">
        {copied ? t("userDigest.copied") : t("userDigest.copyLink")}
      </button>
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  fontFamily: "var(--font-label)",
  fontSize: "0.78rem",
  letterSpacing: "0.03em",
  color: "#6f5a44",
  textDecoration: "none",
  borderBottom: "1px solid #b8860b",
  lineHeight: 1.4,
  background: "none",
  padding: 0,
};
