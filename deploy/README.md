# EchoEarth Deploy

Single-binary deploy designed for small VPS hosts (≥256 MB RAM works).
The Go server hosts both the API/WebSocket and the Vite-built SPA, so the
target box only needs:

- `systemd`
- ability to bind `:80` (provided via `AmbientCapabilities=CAP_NET_BIND_SERVICE`)
- outbound HTTPS for `ip-api.com` (IP fallback geolocation)

No Node, no nginx, no Docker on the target.

## Build the bundle locally

Run from the repo root:

```bash
make deploy-bundle
```

This produces `dist/deploy-bundle/` containing:

```
bin/echoearth        # linux/amd64, CGO_ENABLED=0, -ldflags='-s -w'
web/                 # frontend/dist (vite build)
echoearth.service
install.sh
README.md
```

## Push to a host and install

```bash
HOST=linuxuser@your.vps.ip
rsync -az --delete dist/deploy-bundle/ "$HOST:/tmp/echoearth-deploy/"
ssh "$HOST" 'cd /tmp/echoearth-deploy && bash install.sh'
```

After install:

```bash
curl http://<host>/healthz       # {"status":"ok"}
curl http://<host>/api/bootstrap # JSON with ipLocation/activeBubbles/online
```

The browser then visits `http://<host>/` directly.

## Operations

- Logs: `journalctl -u echoearth -f`
- Restart: `sudo systemctl restart echoearth`
- Stop / disable: `sudo systemctl disable --now echoearth`
- Uninstall: `sudo rm -rf /opt/echoearth /etc/systemd/system/echoearth.service && sudo userdel echoearth`

## Env vars (set in the unit)

| Var                   | Default            | Notes                                   |
| --------------------- | ------------------ | --------------------------------------- |
| `ECHOEARTH_ADDR`      | `:8080` (dev `:80` in unit) | Listen address                  |
| `ECHOEARTH_STATIC_DIR`| empty (dev) / `/opt/echoearth/web` | Enables SPA hosting + fallback |

When `ECHOEARTH_STATIC_DIR` is empty the server only exposes
`/healthz`, `/api/*`, and `/ws`, leaving the frontend to Vite — exactly the
local dev behaviour.

## Why no nginx?

For a 1 GB VPS with a single Go service, a reverse proxy is just extra
RSS + an extra failure mode. The Go binary already handles TLS-less HTTP
fine. Add nginx / caddy only when adding TLS or multi-app routing.

## Resource budget (observed)

| Component | RSS         |
| --------- | ----------- |
| Go server | ~15–25 MB idle, ~40 MB under WS load |
| Cached assets | ~400 KB on disk |

`MemoryMax=256M` in the unit caps any runaway.
