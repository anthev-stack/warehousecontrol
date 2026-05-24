#!/bin/bash
# First-time setup on a server that may already run other web apps (Caddy or nginx).
# - Does NOT remove or replace existing sites
# - Picks a free local port (3001+ if 3000 is taken)
# - Adds only warehousecontrol.cc reverse proxy (Caddy preferred if port 80 is in use)
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

port_80_listener() {
  if command -v ss >/dev/null 2>&1; then
    ss -tlnp 2>/dev/null | grep ':80 ' | head -1 || true
  else
    netstat -tlnp 2>/dev/null | grep ':80 ' | head -1 || true
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

install_node_deps() {
  if [ -f package-lock.json ]; then
    if ! npm ci; then
      echo "WARN: npm ci failed (lock file out of sync). Falling back to npm install..."
      npm install
    fi
  else
    npm install
  fi
}

configure_caddy() {
  local port="$1"
  local snippet="/etc/caddy/Caddyfile.d/warehousecontrol.caddy"
  local main="/etc/caddy/Caddyfile"

  mkdir -p /etc/caddy/Caddyfile.d
  sed "s/__PORT__/${port}/g" deploy/caddy.conf.template > "$snippet"

  if [ -f "$main" ] && ! grep -q 'Caddyfile.d' "$main"; then
    echo "" >> "$main"
    echo "import /etc/caddy/Caddyfile.d/*.caddy" >> "$main"
  fi

  if command -v caddy >/dev/null 2>&1; then
    caddy validate --config "$main"
    systemctl reload caddy || systemctl restart caddy
    echo "==> Caddy configured for ${DOMAIN} -> 127.0.0.1:${port} (HTTPS automatic)"
  else
    echo "ERROR: Caddy is not installed but port 80 appears to be in use." >&2
    echo "Install Caddy or free port 80 for nginx, then re-run this script." >&2
    exit 1
  fi
}

configure_nginx() {
  local port="$1"
  sed "s/__PORT__/${port}/g" deploy/nginx.conf.template > /etc/nginx/sites-available/warehousecontrol
  ln -sf /etc/nginx/sites-available/warehousecontrol /etc/nginx/sites-enabled/warehousecontrol
  nginx -t
  systemctl reload nginx || systemctl start nginx
  echo "==> nginx configured for ${DOMAIN} -> 127.0.0.1:${port}"
  echo "    Enable HTTPS: sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
}

echo "==> Installing build tools..."
apt-get update
apt-get install -y curl git build-essential

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

if [ -n "${WAREHOUSECONTROL_PORT:-}" ]; then
  PORT="$WAREHOUSECONTROL_PORT"
  echo "==> WAREHOUSECONTROL_PORT override: ${PORT}"
fi

if [ -f .env ] && grep -q '^PORT=' .env; then
  if [ -z "${WAREHOUSECONTROL_PORT:-}" ]; then
    PORT="$(grep '^PORT=' .env | cut -d= -f2 | tr -d '"')"
    echo "==> Reusing PORT=${PORT} from existing .env"
  fi
fi

if [ ! -f .env ]; then
  AUTH_SECRET=$(openssl rand -base64 48 | tr -d '/+=' | head -c 48)
  mkdir -p data
  cat > .env <<EOF
DATABASE_URL="file:${APP_DIR}/data/prod.db"
AUTH_SECRET="${AUTH_SECRET}"
NODE_ENV=production
PORT=${PORT}
EOF
  echo "Created .env with PORT=${PORT} and a random AUTH_SECRET."
elif [ -n "${WAREHOUSECONTROL_PORT:-}" ]; then
  if grep -q '^PORT=' .env; then
    sed -i "s/^PORT=.*/PORT=${PORT}/" .env
  else
    echo "PORT=${PORT}" >> .env
  fi
  echo "Updated .env PORT=${PORT}"
fi

sed "s/\${PORT}/${PORT}/g" deploy/ecosystem.config.cjs.template > ecosystem.config.cjs

echo "==> Installing dependencies and building..."
install_node_deps
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

LISTENER_80="$(port_80_listener)"
USE_CADDY=0
if command -v caddy >/dev/null 2>&1; then
  USE_CADDY=1
elif echo "$LISTENER_80" | grep -qi caddy; then
  USE_CADDY=1
elif port_in_use 80 && ! command -v nginx >/dev/null 2>&1; then
  echo "==> Port 80 in use by another process (likely Caddy). Will configure Caddy if available."
  USE_CADDY=1
fi

echo "==> Configuring reverse proxy for ${DOMAIN}..."
if [ "$USE_CADDY" -eq 1 ]; then
  if ! command -v caddy >/dev/null 2>&1; then
    echo "==> Installing Caddy..."
    apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg 2>/dev/null || true
    if [ ! -f /usr/share/keyrings/caddy-stable-archive-keyring.gpg ]; then
      apt-get install -y caddy || true
    fi
  fi
  if command -v caddy >/dev/null 2>&1; then
    configure_caddy "$PORT"
  else
    echo "WARN: Could not configure Caddy. Add this block to your existing Caddyfile manually:"
    sed "s/__PORT__/${PORT}/g" deploy/caddy.conf.template
  fi
else
  if ! command -v nginx >/dev/null 2>&1; then
    apt-get install -y nginx
  fi
  configure_nginx "$PORT"
fi

echo ""
echo "Done."
echo "  App port:  ${PORT}"
echo "  App dir:   ${APP_DIR}"
echo "  Domain:    https://${DOMAIN} (once DNS points here; Caddy provisions TLS automatically)"
echo ""
