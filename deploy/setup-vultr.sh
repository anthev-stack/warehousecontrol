#!/bin/bash
# First-time setup on a server that may already run other web apps.
# - Does NOT remove or replace existing nginx sites
# - Picks a free local port (3001+ if 3000 is taken)
# - Adds only the warehousecontrol.cc nginx vhost
#
# Optional env overrides:
#   WAREHOUSECONTROL_PORT=3001
#   APP_DIR=/var/www/warehousecontrol
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/warehousecontrol}"
APP_USER="${APP_USER:-www-data}"
DOMAIN="warehousecontrol.cc"
REPO="https://github.com/anthev-stack/warehousecontrol.git"
NODE_MAJOR=22

port_in_use() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -tln | grep -q ":${port} "
  else
    netstat -tln 2>/dev/null | grep -q ":${port} "
  fi
}

pick_port() {
  if [ -n "${WAREHOUSECONTROL_PORT:-}" ]; then
    if port_in_use "$WAREHOUSECONTROL_PORT"; then
      echo "ERROR: WAREHOUSECONTROL_PORT=${WAREHOUSECONTROL_PORT} is already in use." >&2
      exit 1
    fi
    echo "$WAREHOUSECONTROL_PORT"
    return
  fi

  for port in 3001 3002 3003 3004 3005 3006 3007 3008; do
    if ! port_in_use "$port"; then
      echo "$port"
      return
    fi
  done

  echo "ERROR: No free port found in 3001-3008. Set WAREHOUSECONTROL_PORT manually." >&2
  exit 1
}

echo "==> Installing build tools (nginx/git left as-is if already installed)..."
apt-get update
apt-get install -y curl git build-essential
if ! command -v nginx >/dev/null 2>&1; then
  apt-get install -y nginx
fi
if ! command -v certbot >/dev/null 2>&1; then
  apt-get install -y certbot python3-certbot-nginx
fi

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

echo "==> Cloning application..."
mkdir -p "$(dirname "$APP_DIR")"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO" "$APP_DIR"
else
  cd "$APP_DIR"
  git pull origin main
fi

cd "$APP_DIR"

PORT="$(pick_port)"
echo "==> Using port ${PORT} (existing apps on other ports are untouched)."

if [ -f .env ] && grep -q '^PORT=' .env; then
  PORT="$(grep '^PORT=' .env | cut -d= -f2 | tr -d '"')"
  echo "==> Reusing PORT=${PORT} from existing .env"
else
  AUTH_SECRET=$(openssl rand -base64 48 | tr -d '/+=' | head -c 48)
  mkdir -p data
  cat > .env <<EOF
DATABASE_URL="file:${APP_DIR}/data/prod.db"
AUTH_SECRET="${AUTH_SECRET}"
NODE_ENV=production
PORT=${PORT}
EOF
  echo "Created .env with PORT=${PORT} and a random AUTH_SECRET."
fi

sed "s/\${PORT}/${PORT}/g" deploy/ecosystem.config.cjs.template > ecosystem.config.cjs

echo "==> Installing dependencies and building..."
npm ci
npm run build
npm run db:push
npm run db:seed

chown -R "$APP_USER:$APP_USER" "$APP_DIR"

echo "==> Starting warehousecontrol with PM2 (other PM2 apps are not modified)..."
sudo -u "$APP_USER" env HOME="$APP_DIR" pm2 delete warehousecontrol 2>/dev/null || true
sudo -u "$APP_USER" env HOME="$APP_DIR" pm2 start ecosystem.config.cjs
sudo -u "$APP_USER" env HOME="$APP_DIR" pm2 save

if ! systemctl list-units --type=service 2>/dev/null | grep -q 'pm2-'; then
  echo "==> Configuring PM2 to start on boot (first PM2 app on this server)..."
  env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$APP_USER" --hp "$APP_DIR" | tail -1 | bash || true
else
  echo "==> PM2 startup already configured on this server — skipped."
fi

echo "==> Adding nginx vhost for ${DOMAIN} only (other sites unchanged)..."
sed "s/__PORT__/${PORT}/g" deploy/nginx.conf.template > /etc/nginx/sites-available/warehousecontrol
ln -sf /etc/nginx/sites-available/warehousecontrol /etc/nginx/sites-enabled/warehousecontrol
nginx -t
systemctl reload nginx

echo ""
echo "Done."
echo "  App port:  ${PORT} (localhost only — nginx proxies ${DOMAIN} to this port)"
echo "  App dir:   ${APP_DIR}"
echo ""
echo "Next steps:"
echo "  1. Point ${DOMAIN} and www.${DOMAIN} A records to this server."
echo "  2. Enable HTTPS (does not affect other domains on this server):"
echo "     sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo ""
