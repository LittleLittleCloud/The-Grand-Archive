import { Container } from "@cloudflare/containers";
import type { Bindings } from "./types";

/**
 * RSSHub packaged as a Cloudflare Container. It is only ever invoked by the
 * ingestion cron through the RSSHUB binding (never publicly exposed), so it
 * scales to zero between runs: it wakes on the first request of an ingestion
 * cycle and shuts down `sleepAfter` the last one.
 *
 * The image (diygod/rsshub:chromium-bundled) bundles Chromium for the handful
 * of routes that need a headless browser; it runs on the `standard-1` instance
 * type (4 GiB / 8 GB disk) configured in wrangler.jsonc.
 */
export class RsshubContainer extends Container<Bindings> {
  // RSSHub listens on 1200 by default.
  override defaultPort = 1200;
  // Cron runs every 30 min and a cycle's RSSHub requests come back-to-back, so
  // sleep quickly after the last one to minimise idle billing (it cold-starts
  // each cycle regardless, since 30 min >> sleepAfter).
  override sleepAfter = "20s";
  // RSSHub must reach upstream sites to build feeds.
  override enableInternet = true;
}
