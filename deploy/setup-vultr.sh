#!/bin/bash
# First-time setup on Ubuntu 22.04/24.04 (Vultr). Run as root or with sudo.
set -euo pipefail

APP_DIR="/var/www/warehousecontrol"
APP_USER="www-data"
DOMAIN="warehousecontrol.cc"
REPO="https://github.com/anthev-stack/warehousecontrol.git"
NODE_MAJOR=22

echo "==> Installing system packages..."
apt-get update
apt-get install -y curl git nginx certbot python3-certbot-nginx build-essential

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

if [ ! -f .env ]; then
  AUTH_SECRET=$(openssl rand -base64 48 | tr -d '/+=' | head -c 48)
  mkdir -p data
  cat > .env <<EOF
DATABASE_URL="file:${APP_DIR}/data/prod.db"
AUTH_SECRET="${AUTH_SECRET}"
NODE_ENV=production
PORT=3000
EOF
  echo "Created .env with a random AUTH_SECRET."
fi

echo "==> Installing dependencies and building..."
npm ci
npm run build
npm run db:push
npm run db:seed

chown -R "$APP_USER:$APP_USER" "$APP_DIR"

echo "==> Starting app with PM2..."
sudo -u "$APP_USER" env HOME="$APP_DIR" pm2 delete warehousecontrol 2>/dev/null || true
sudo -u "$APP_USER" env HOME="$APP_DIR" pm2 start ecosystem.config.cjs
sudo -u "$APP_USER" env HOME="$APP_DIR" pm2 save
env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$APP_USER" --hp "$APP_DIR" | tail -1 | bash || true

echo "==> Configuring nginx..."
cp deploy/nginx.conf /etc/nginx/sites-available/warehousecontrol
ln -sf /etc/nginx/sites-available/warehousecontrol /etc/nginx/sites-enabled/warehousecontrol
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> SSL (run after DNS points ${DOMAIN} to this server)..."
echo "    certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos -m you@example.com"

echo "Done. Point ${DOMAIN} A record to this server, then run certbot as shown above."
