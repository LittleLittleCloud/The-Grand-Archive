import TurndownService from "turndown";
import domino from "@mixmark-io/domino";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

/**
 * Convert HTML content to Markdown. On Workers there is no DOMParser, and
 * wrangler bundles turndown's browser build, so we parse the HTML with domino
 * and hand turndown a DOM node (never an HTML string).
 */
export function parseContent(html: string): string {
  if (!html) return "";
  const doc = domino.createDocument(html);
  return turndown.turndown(doc.body);
}
