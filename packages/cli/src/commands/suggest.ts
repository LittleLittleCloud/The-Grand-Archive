import type { DakClient } from "@littlelittlecloud/dak";
import { parseArgs } from "../args";
import { formatTable, formatJson } from "../output";

export async function suggestCommand(client: DakClient, args: string[]) {
  const { flags, positional } = parseArgs(args);
  const query = positional.join(" ");

  if (!query) {
    console.error("Usage: dak suggest <query> [--limit <n>] [--json]");
    process.exit(1);
  }

  // Suggest uses the same search endpoint with a small limit
  const result = await client.search({
    q: query,
    limit: flags.limit ? parseInt(flags.limit, 10) : 5,
  });

  if (flags.json) {
    console.log(formatJson(result));
  } else {
    if (result.results.length === 0) {
      console.log("No suggestions found.");
    } else {
      console.log(`Suggestions for "${query}":\n`);
      console.log(formatTable(result.results));
    }
  }
}
