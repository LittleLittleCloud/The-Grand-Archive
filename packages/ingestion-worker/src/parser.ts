import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

/** Convert HTML content to Markdown. Returns empty string for empty input. */
export function parseContent(html: string): string {
  if (!html) return "";
  return turndown.turndown(html);
}
