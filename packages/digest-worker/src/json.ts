/** Best-effort JSON extraction from an LLM response that may include prose or
 *  code fences around the JSON payload. */
export function extractJson<T>(text: string): T | null {
  if (!text) return null;
  let s = text.trim();

  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) s = fence[1].trim();

  const firstObj = s.indexOf("{");
  const firstArr = s.indexOf("[");
  let start: number;
  if (firstObj === -1) start = firstArr;
  else if (firstArr === -1) start = firstObj;
  else start = Math.min(firstObj, firstArr);
  if (start === -1) return null;

  const open = s[start];
  const close = open === "{" ? "}" : "]";
  const end = s.lastIndexOf(close);
  if (end <= start) return null;

  try {
    return JSON.parse(s.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
