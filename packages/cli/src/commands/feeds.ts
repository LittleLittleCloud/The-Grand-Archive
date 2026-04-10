import type { DakClient } from "@littlelittlecloud/dak";
import { parseArgs } from "../args";
import { formatEntries, formatJson } from "../output";

export async function feedsCommand(client: DakClient, args: string[]) {
  const { flags } = parseArgs(args);

  const result = await client.getFeeds({
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
    console.log(`${result.total} entries:\n`);
    console.log(formatEntries(result.entries));
  }
}
