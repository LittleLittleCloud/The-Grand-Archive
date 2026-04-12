import { DakClient } from "@littlelittlecloud/dak";
import { searchCommand } from "./commands/search";
import { feedsCommand } from "./commands/feeds";
import { statsCommand } from "./commands/stats";
import { suggestCommand } from "./commands/suggest";
import { formatTable, formatJson } from "./output";

const BASE_URL = process.env.DAK_SERVER_URL ?? "https://dak-news.com";
const API_KEY = process.env.DAK_API_KEY;

const client = new DakClient({ baseUrl: BASE_URL, apiKey: API_KEY });

const [command, ...args] = process.argv.slice(2);

async function main() {
  switch (command) {
    case "search":
      await searchCommand(client, args);
      break;
    case "feeds":
      await feedsCommand(client, args);
      break;
    case "stats":
      await statsCommand(client);
      break;
    case "suggest":
      await suggestCommand(client, args);
      break;
    case "help":
    case "--help":
    case "-h":
    case undefined:
      printHelp();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  console.log(`
dak — 大案牍库 CLI

Usage:
  dak search <query> [options]    Full-text search
  dak feeds [options]             List feed entries
  dak stats                      Show statistics
  dak suggest <query>            Suggest related entries
  dak help                       Show this help

Options:
  --category <cat>     Filter by category
  --source <src>       Filter by source
  --from <date>        Start date (ISO 8601)
  --to <date>          End date (ISO 8601)
  --limit <n>          Max results (default: 20)
  --json               Output as JSON

Environment:
  DAK_SERVER_URL       Server URL (default: https://dak-news.com)
  DAK_API_KEY          API key for authenticated access
`.trim());
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});

export { formatTable, formatJson };
