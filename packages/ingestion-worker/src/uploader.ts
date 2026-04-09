import type { EntryCreate, IngestResponse } from "@dak/contract";

const BATCH_SIZE = 500;

/** Upload entries to the server in batches. */
export async function uploadEntries(
  serverUrl: string,
  apiKey: string,
  entries: EntryCreate[]
): Promise<IngestResponse> {
  let totalInserted = 0;
  let totalDuplicates = 0;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const res = await fetch(`${serverUrl}/api/entries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ entries: batch }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Upload failed (${res.status}): ${body}`);
    }

    const result = (await res.json()) as IngestResponse;
    totalInserted += result.inserted;
    totalDuplicates += result.duplicates;
  }

  return { inserted: totalInserted, duplicates: totalDuplicates };
}
