# Correction of Error: Fly.io worker app accumulated 16 machines across deploys

Date: 2026-05-02

## Summary

The `dak-worker` Fly.io app, a background RSS ingestion worker, accumulated 16 machines (8 running, 8 stopped) over a series of deployments. Each `flyctl deploy` created new machine pairs without cleaning up old ones, resulting in 8× redundant ingestion runs every 30 minutes and an inflated Fly.io bill.

The issue was resolved by destroying 15 orphan machines, adding deployment guards, and converting the worker from a 24/7 process to an hourly Fly Machine schedule.

## Impact

- **Cost**: Estimated ~$15.52/mo in worker compute (8 running machines × $1.94) plus ~$3–5/mo in redundant egress from 8 workers all POSTing identical data to the production server. April bill was $11 for compute and $5 for egress.
- **Redundant work**: All 8 running workers fetched the same RSS sources every 30 minutes and POSTed identical entries to `dak-server`. The server's deduplication logic rejected the duplicates, but the network traffic and CPU cycles were wasted.
- **No data loss or correctness issue**: Deduplication at the ingest endpoint ensured no duplicate entries were inserted.

## Root cause

`flyctl deploy` uses a blue-green deployment strategy by default. For apps **with** `[http_service]`, Fly health-checks the new machines via HTTP, then destroys old ones. For apps **without** `[http_service]` (like `dak-worker`), Fly cannot health-check the new machines and does not reliably clean up old ones.

Each deploy created a new machine pair. Without a cleanup mechanism, machines accumulated across deployments.

## Contributing factors

1. **No `[http_service]` on the worker app** — Fly's deploy strategy cannot perform health checks or blue-green cutover for non-HTTP apps, leaving old machines behind.
2. **No `[deploy] strategy = "immediate"`** — The fly.toml did not specify an in-place update strategy, so Fly defaulted to creating new machines.
3. **Rapid deploy cadence** — 12 deploys occurred between Apr 28–29 (v30–v41), each potentially creating new machines.
4. **No pre-deploy guard** — Unlike `dak-server` which had `check-fly-single-machine.ts`, the worker deploy had no validation step.
5. **No monitoring or alerting** — No mechanism to detect unexpected machine count growth.

## Detection

The issue was detected during a manual billing investigation on 2026-05-02. Running `flyctl machines list -a dak-worker` revealed 16 machines, 8 in `started` state.

## Timeline

All times UTC.

| Date | Event |
|---|---|
| 2026-04-09 06:25 | Initial 2 machines created for `dak-worker` (first deploy) |
| 2026-04-28 23:29 | v30 deployed — rapid deploy sequence begins |
| 2026-04-28 23:29 – 23:57 | v30–v34: 5 deploys in 28 minutes, creating 6 new machines |
| 2026-04-29 00:04 – 00:21 | v35–v37: 3 more deploys, creating 4 more machines |
| 2026-05-01 04:33 – 04:37 | v39–v40: 2 more deploys, creating 2 more machines |
| 2026-05-01 ~22:36 | v41: latest deploy. Total: 16 machines (8 started, 8 stopped) |
| 2026-05-02 ~16:30 | Issue discovered during billing investigation |
| 2026-05-02 ~16:35 | 15 orphan machines destroyed, 1 kept (`2869e66fee5968`) |
| 2026-05-02 ~16:37 | Machine updated with `--schedule hourly --restart no` and stopped |

## Resolution

Immediate actions:

1. Identified the oldest running machine (`2869e66fee5968`, created Apr 9) as the one to keep.
2. Destroyed all 15 other machines using `flyctl machines destroy --force`.
3. Verified exactly 1 machine remained via `flyctl machines list`.
4. Converted the remaining machine to an hourly schedule (`flyctl machine update --schedule hourly --restart no`).
5. Stopped the machine so it enters the scheduled start/stop cycle.

## Corrective changes

Code and config changes in branch `u/xiaoyun/workerSidetruck`:

- **`packages/ingestion-worker/fly.toml`**:
  - Added `[deploy] strategy = "immediate"` to prevent blue-green machine creation.
  - Changed env from `INTERVAL_MS = "1800000"` to `ONCE = "1"` so the worker runs once and exits.
  - Added `[[restart]] policy = "never"` so a clean exit keeps the machine stopped until the next scheduled start.

- **`.github/workflows/deploy-fly.yml`**:
  - Added "Ensure single worker machine" pre-deploy step that destroys extra machines before deploying, keeping only the oldest.
  - Added "Apply hourly schedule" post-deploy step that re-applies `--schedule hourly --restart no` after each deploy (since `fly.toml` does not support the `schedule` directive).

## Prevention

Recommended follow-ups:

1. **Monitor machine count**: Add a post-deploy validation step or periodic check that alerts if any app has more machines than expected.
2. **Centralize deploy guards**: Consider a shared script similar to `check-fly-single-machine.ts` that validates machine count for all apps before deploy.
3. **Evaluate embedded ingestion**: Moving the ingestion timer into the `dak-server` process would eliminate the worker machine entirely, saving ~$1.94/mo compute and reducing egress to zero for ingestion traffic.
4. **Document Fly.io deploy behavior**: Note in project docs that non-HTTP Fly apps require `[deploy] strategy = "immediate"` and post-deploy cleanup to avoid machine proliferation.

## Cost projection

| Scenario | Worker compute | Egress (worker) | Total monthly |
|---|---|---|---|
| Before (8 running machines, 24/7) | $15.52 | ~$3–5 | ~$18–20 |
| After (1 machine, hourly schedule) | ~$0.07 | ~$0.50 | ~$0.57 |
| Savings | | | **~$17–19/mo** |
