#!/bin/bash
# Check warehousecontrol app status on the server.
APP_DIR="${APP_DIR:-/var/www/warehousecontrol}"
APP_USER="${APP_USER:-www-data}"
PORT="$(grep '^PORT=' "$APP_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '"')"

echo "=== PM2 (warehousecontrol) ==="
sudo -u "$APP_USER" env HOME="$APP_DIR" PM2_HOME="$APP_DIR/.pm2" pm2 list

echo ""
echo "=== App HTTP (127.0.0.1:${PORT:-3001}) ==="
curl -sI "http://127.0.0.1:${PORT:-3001}" | head -5

echo ""
echo "=== Caddy ==="
sudo caddy validate --config /etc/caddy/Caddyfile 2>&1 | tail -3

echo ""
echo "=== Recent logs ==="
sudo -u "$APP_USER" env HOME="$APP_DIR" PM2_HOME="$APP_DIR/.pm2" pm2 logs warehousecontrol --lines 15 --nostream
