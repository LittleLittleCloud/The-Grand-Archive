import { fetchAllSources } from "./fetcher";
import { uploadEntries } from "./uploader";
import { loadSources } from "./config/sources";

const SERVER_URL = process.env.DAK_SERVER_URL ?? "http://localhost:3000";
const API_KEY = process.env.DAK_API_KEY ?? "";
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS ?? "1800000", 10); // default 30 min
const ONCE = process.env.ONCE === "1"; // run once and exit

async function run() {
  console.log(`🔄 [${new Date().toISOString()}] Starting ingestion run...`);
  const sources = loadSources();
  console.log(`📡 ${sources.length} sources loaded`);

  const entries = await fetchAllSources(sources);
  console.log(`📦 ${entries.length} new entries fetched`);

  if (entries.length > 0) {
    const result = await uploadEntries(SERVER_URL, API_KEY, entries);
    console.log(
      `✅ Uploaded: ${result.inserted} inserted, ${result.duplicates} duplicates`
    );
  } else {
    console.log("ℹ️  No new entries to upload");
  }
}

async function main() {
  if (!API_KEY) {
    console.error("❌ DAK_API_KEY is required");
    process.exit(1);
  }

  try {
    await run();
  } catch (err) {
    console.error("❌ Initial run failed:", err);
  }

  if (ONCE) {
    console.log("✅ Single run complete, exiting.");
    return;
  }

  console.log(`⏱️  Scheduling next run in ${INTERVAL_MS / 60000} minutes...`);
  setInterval(async () => {
    try {
      await run();
    } catch (err) {
      console.error("❌ Run failed:", err);
    }
    console.log(`⏱️  Next run in ${INTERVAL_MS / 60000} minutes...`);
  }, INTERVAL_MS);
}

main().catch((err) => {
  console.error("❌ Worker failed:", err);
  process.exit(1);
});
