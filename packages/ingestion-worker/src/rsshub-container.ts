import { Container } from "@cloudflare/containers";
import type { Bindings } from "./types";

/**
 * RSSHub packaged as a Cloudflare Container. It is only ever invoked by the
 * ingestion cron through the RSSHUB binding (never publicly exposed), so it
 * scales to zero between runs: it wakes on the first request of an ingestion
 * cycle and is stopped explicitly when the cycle finishes (see runIngestion),
 * with `sleepAfter` as a fallback.
 *
 * The image (diygod/rsshub:chromium-bundled) bundles Chromium for the handful
 * of routes that need a headless browser; it runs on the custom instance type
 * (1 vCPU / 2 GiB / 4 GB disk) configured in wrangler.jsonc.
 */
export class RsshubContainer extends Container<Bindings> {
  // RSSHub listens on 1200 by default.
  override defaultPort = 1200;
  // A cycle's RSSHub requests come back-to-back and the cron interval is hours,
  // so sleep quickly after the last one to minimise idle billing. This is only
  // a fallback: runIngestion stops the container as soon as the cycle ends.
  override sleepAfter = "20s";
  // RSSHub must reach upstream sites to build feeds.
  override enableInternet = true;
}
