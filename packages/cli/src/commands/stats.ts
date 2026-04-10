import type { DakClient } from "@littlelittlecloud/dak";
import { formatStats, formatJson } from "../output";

export async function statsCommand(client: DakClient) {
  const stats = await client.getStats();

  if (process.argv.includes("--json")) {
    console.log(formatJson(stats));
  } else {
    console.log(formatStats(stats));
  }
}
