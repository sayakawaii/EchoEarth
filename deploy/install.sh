#!/usr/bin/env bash
# Installer for EchoEarth on a Linux host with systemd.
# Run from the bundle directory that contains:
#   bin/echoearth        (linux/amd64 static binary)
#   web/                 (vite build output)
#   echoearth.service    (systemd unit shipped in this dir)
#
# Layout on target:
#   /opt/echoearth/bin/echoearth
#   /opt/echoearth/web/...
#   /etc/systemd/system/echoearth.service
set -euo pipefail

PREFIX=/opt/echoearth
UNIT_SRC="$(dirname "$0")/echoearth.service"
UNIT_DST=/etc/systemd/system/echoearth.service

if [[ ! -x ./bin/echoearth || ! -f ./web/index.html || ! -f "$UNIT_SRC" ]]; then
  echo "error: run from the deploy bundle directory (missing bin/, web/, or echoearth.service)" >&2
  exit 1
fi

echo "==> ensure system user 'echoearth'"
if ! id -u echoearth >/dev/null 2>&1; then
  sudo useradd --system --no-create-home --shell /usr/sbin/nologin echoearth
fi

echo "==> install layout under $PREFIX"
sudo install -d -o root      -g root      -m 0755 "$PREFIX"
sudo install -d -o root      -g root      -m 0755 "$PREFIX/bin"
sudo install -d -o echoearth -g echoearth -m 0755 "$PREFIX/web"

echo "==> install binary"
sudo install -m 0755 ./bin/echoearth "$PREFIX/bin/echoearth"

echo "==> sync web assets"
sudo rsync -a --delete ./web/ "$PREFIX/web/"
sudo chown -R echoearth:echoearth "$PREFIX/web"

echo "==> install systemd unit"
sudo install -m 0644 "$UNIT_SRC" "$UNIT_DST"
sudo systemctl daemon-reload
sudo systemctl enable echoearth >/dev/null

echo "==> open firewall (ufw) port 80 if ufw is active"
if command -v ufw >/dev/null && sudo ufw status | grep -q "Status: active"; then
  sudo ufw allow 80/tcp >/dev/null || true
fi

echo "==> (re)start service"
sudo systemctl restart echoearth
sleep 1
sudo systemctl --no-pager --full status echoearth | head -20

echo "==> done. health check:"
curl -fsS http://127.0.0.1/healthz && echo
