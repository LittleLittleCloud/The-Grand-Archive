import type { DakClient } from "@littlelittlecloud/dak";
import { parseArgs } from "../args";
import { formatTable, formatJson } from "../output";

export async function searchCommand(client: DakClient, args: string[]) {
  const { flags, positional } = parseArgs(args);
  const query = positional.join(" ");

  if (!query) {
    console.error("Usage: dak search <query> [--category <cat>] [--source <src>] [--from <date>] [--to <date>] [--limit <n>] [--json]");
    process.exit(1);
  }

  const result = await client.search({
    q: query,
    category: flags.category,
    source: flags.source,
    from: flags.from,
    to: flags.to,
    limit: flags.limit ? parseInt(flags.limit, 10) : undefined,
    offset: flags.offset ? parseInt(flags.offset, 10) : undefined,
  });

  if (flags.json) {
    console.log(formatJson(result));
  } else {
    console.log(`Found ${result.total} results for "${result.query}":\n`);
    if (result.tierCutoff) {
      console.log(`⚠ Results limited to entries after ${result.tierCutoff} (${result.tier} tier). Sign in or upgrade for full access.\n`);
    }
    console.log(formatTable(result.results));
  }
}
