# Correction of Error: Fly.io SQLite volume split caused empty production data

Date: 2026-04-30

## Summary

Production data appeared to disappear because the `dak-server` Fly.io app had two machines attached to different volumes. The traffic-serving machine was attached to a newly created volume containing an empty SQLite database, while the older stopped machine still had the original populated database.

Service was restored by moving traffic back to the original machine and deleting the empty machine and volume. The original database was also downloaded to a local backup outside the repository.

## Impact

- Public API and UI responses showed an empty archive while the new machine served traffic.
- The running machine reported `entries = 0`, `users = 0`, and `api_keys = 0`.
- The original stopped machine still contained `entries = 43126`, `users = 3`, `sessions = 8`, and `api_keys = 2`.
- During recovery, there was a short `502` window while the old machine rebuilt the FTS5 index before listening on port `3000`.

## Root cause

The production app used SQLite on a Fly.io volume, but the deployment could create or start another machine with its own fresh volume. The application opens SQLite with `create: true`, so a missing `/data/dak.db` is silently initialized as a valid empty database.

Litestream was configured for ongoing replication but the production boot command did not perform a restore before starting the application on a fresh volume. As a result, the new machine initialized and served an empty database instead of restoring from the replica first.

## Contributing factors

- Fly.io volumes are machine-local; multiple machines mean multiple independent SQLite files.
- The production `fly.toml` mounted `dak_data` but did not explicitly restore from Litestream on first boot.
- The deployment strategy allowed a replacement machine and volume to come up alongside the old machine.
- Startup waited for a full FTS5 rebuild before binding the HTTP port, producing temporary `502` responses during recovery.
- SQLite backup files were not globally ignored, increasing the risk of accidentally committing local production DB snapshots.

## Detection

The issue was detected manually after production appeared empty. We confirmed the state with Fly.io machine and volume inspection:

- Empty current machine: `48e7e62f26e158`, volume `vol_vp2zllpe632d2x24`, `/data/dak.db` about `124K`, `entries = 0`.
- Original populated machine: `d897195be92558`, volume `vol_rnz73jyl5nwl27kr`, `/data/dak.db` about `96M` plus WAL, `entries = 43126`.

## Timeline

All times are UTC on 2026-04-30 unless noted.

- `15:46`: New machine `48e7e62f26e158` restarted and initialized `/data/dak.db`; logs showed `FTS5 index built: 0 entries`.
- `16:00`: Original machine `d897195be92558` was cordoned, started, and inspected. Its volume contained the original data.
- `16:01`: Original machine was uncordoned and empty machine was stopped.
- `16:04`: Original machine finished rebuilding FTS5 for `43126` entries and started listening on port `3000`.
- `16:06`: Health and stats checks passed with `total = 43126`.
- Later: Empty machine `48e7e62f26e158` and empty volume `vol_vp2zllpe632d2x24` were destroyed.

## Resolution

Immediate recovery actions:

1. Identified that the old stopped machine still had the populated volume.
2. Cordoned and started the old machine for inspection.
3. Verified row counts in the old database.
4. Downloaded `/data/dak.db`, `/data/dak.db-wal`, and `/data/dak.db-shm` from the old machine to a local backup outside the repository.
5. Uncordoned the old machine and stopped the empty machine.
6. Verified production `/health` and `/api/stats` returned healthy data.
7. Destroyed the empty machine and empty volume.

Verified final production state:

- One production machine remains: `d897195be92558`.
- One production volume remains: `vol_rnz73jyl5nwl27kr`.
- `/api/stats` returns `total = 43126`.

## Corrective changes

Code and config changes in this branch:

- Production Fly config now uses an immediate deployment strategy to avoid creating a parallel machine for this single-writer SQLite service.
- Production boot command now runs `litestream restore -if-db-not-exists -if-replica-exists /data/dak.db` before starting replication and the app.
- Server startup now binds HTTP after migrations and builds the FTS5 index in the background, keeping health, stats, feeds, and auth available during cold starts.
- `.gitignore` now excludes root-level SQLite backup files: `*.db`, `*.db-shm`, and `*.db-wal`.
- `scripts/check-fly-single-machine.ts` now provides a pre-deploy guard. It fails deployment unless `dak-server` has exactly one Fly machine and one attached `dak_data` volume.

## Prevention

Recommended follow-ups:

1. Keep production SQLite as a single-writer Fly.io app with exactly one machine and one attached volume unless the data layer is changed.
2. Before any deploy, run `bun run predeploy:server` or rely on the GitHub Actions pre-deploy guard to confirm `dak-server` has exactly one production machine and one attached volume.
3. Add an automated post-deploy smoke check that fails if `/api/stats.total` is unexpectedly low.
4. Add a startup guard for production that refuses to serve if `/data/dak.db` is newly created and Litestream restore was not attempted.
5. Consider a dedicated restore runbook for replacing the production volume from R2/Litestream.
6. Consider moving searchable FTS rebuild to a persisted/index migration path or adding readiness semantics if search must be fully warm before serving search traffic.

## Validation

Validation performed after recovery:

- `curl https://dak-server.fly.dev/health` returned `{"status":"ok"}`.
- `curl https://dak-server.fly.dev/api/stats` returned `total = 43126`.
- Server tests passed with `PORT=0 bun test packages/server/src/routes/feeds.test.ts`.
- Server bundle built successfully with `bun build packages/server/src/index.ts --outdir /tmp/dak-server-build --target bun --external @node-rs/jieba --external @node-rs/jieba/dict`.