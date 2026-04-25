import { useState, useEffect, type MouseEvent } from "react";

const NAV_EVENT = "spa:navigate";

/** Programmatic navigation via History API */
export function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new Event(NAV_EVENT));
}

/** React hook — returns current pathname, re-renders on navigation */
export function usePath(): string {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener("popstate", update);
    window.addEventListener(NAV_EVENT, update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener(NAV_EVENT, update);
    };
  }, []);
  return path;
}

/**
 * Click handler for <a> tags — intercepts internal links and uses pushState.
 * Attach to onClick of any <a href="/..."> that should be SPA-navigated.
 */
export function handleLinkClick(e: MouseEvent<HTMLAnchorElement>) {
  // Let modifier-key clicks (open in new tab) pass through
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const href = e.currentTarget.getAttribute("href");
  if (!href || href.startsWith("http") || href.startsWith("mailto:")) return;
  e.preventDefault();
  navigate(href);
}
