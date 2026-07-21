# Operations

How to run Pew Pew Collection in a way you can monitor, back up, and recover.

## Health probe

`GET /health` returns `200 { status, version, uptime }` without requiring
authentication and is excluded from the request log. Use it from a reverse
proxy, Docker `HEALTHCHECK`, or an external monitor like Uptime Kuma.

```bash
curl -s http://localhost:3000/health | jq
```

```json
{
  "status": "ok",
  "version": "2.x.y",
  "uptime": 1234.56
}
```

## Container health

The published image declares `HEALTHCHECK` against `/health`. Check the
status with:

```bash
docker inspect --format '{{.State.Health.Status}}' ppcollection
```

It reports `healthy` once the HTTP server is serving requests.

## Graceful shutdown

The process traps `SIGTERM` and `SIGINT`, stops accepting new connections,
drains in-flight requests, and closes the SQLite database before exiting.
`docker compose` ships with a 15s `stop_grace_period`. Plain `docker stop`
sends `SIGTERM` and waits 10s before `SIGKILL` — bump that with
`docker stop -t 15` if you want headroom.

## Audit logs

Structured JSON log lines on stdout for:

- `auth.login`
- `auth.logout`
- `auth.password_change`
- `firearms.create`
- `firearms.update`
- `firearms.delete`
- `firearms.import`

Example:

```json
{"ts":"2026-05-31T18:42:01.234Z","event":"firearms.create","user":"[redacted]","firearm":"[redacted]"}
```

With `AUDIT_VERBOSE=true`, the `user` and `firearm` fields contain the
username and serial. Keep it off unless you need the metadata in your log
pipeline.

Ship stdout to your log collector — `journalctl`, the Docker `json-file`
driver, Loki, CloudWatch, etc.

## Request logs

`morgan` writes a one-line summary of every request to stdout, except for
`GET /health`. Use a log driver to rotate / forward.

## Backup and restore

The database and photo files both live under the data directory. To take a
hot backup:

```bash
# Database (hot backup via SQLite CLI)
docker exec ppcollection sqlite3 /data/app.db ".backup /data/app.db.bak"
cp ./data/app.db.bak /your/backup/location/

# Photos (copy the entire photos directory)
cp -r ./data/photos /your/backup/location/
```

To restore:

```bash
docker stop ppcollection
cp /your/backup/location/app.db.bak ./data/app.db
cp -r /your/backup/location/photos ./data/
docker start ppcollection
```

A simpler approach is to stop the container and copy the entire `./data`
directory — this captures the database and all photos in one step:

```bash
docker stop ppcollection
cp -r ./data /your/backup/location/
docker start ppcollection
```

## CSV export

For a portable, human-readable snapshot, use the in-app CSV export
(**Inventory → Export CSV**). The export round-trips with the importer and
includes disposition fields.

## Update check

When `UPDATE_CHECK=true`, the app polls GitHub Releases once every 14 days
and surfaces a banner if a newer tag is available. This is the only outbound
call the app makes; it fails silently when offline. Off by default in line
with the offline-first principle.

## Resource footprint

Pew Pew Collection is a single Node.js process with a SQLite file. Typical
idle footprint:

- Memory: ~60–120 MB RSS
- CPU: idle near 0%
- Disk: the database is on the order of KB per firearm, including history

A Raspberry Pi 4 is more than enough hardware. The published image is
multi-arch (`amd64`, `arm64`).
