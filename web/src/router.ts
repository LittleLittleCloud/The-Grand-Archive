import { useState, useEffect, useCallback } from "react";

/** Simple hash-based router — no dependencies needed */

export interface Route {
  /** "home" | "entry" */
  page: string;
  /** For entry page: the entry path (feeds/category/filename) */
  params: Record<string, string>;
}

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (!hash || hash === "/") {
    return { page: "home", params: {} };
  }

  // #/entry/feeds/finance/2026-03-12_xxx_abc123
  if (hash.startsWith("entry/")) {
    const path = hash.slice("entry/".length);
    return { page: "entry", params: { path } };
  }

  return { page: "home", params: {} };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((page: string, params: Record<string, string> = {}) => {
    if (page === "home") {
      window.location.hash = "#/";
    } else if (page === "entry" && params.path) {
      window.location.hash = `#/entry/${params.path}`;
    }
  }, []);

  return { route, navigate };
}

/** Build a full URL for an entry (for sharing / third-party use) */
export function entryUrl(path: string): string {
  return `${window.location.origin}${window.location.pathname}#/entry/${path}`;
}
