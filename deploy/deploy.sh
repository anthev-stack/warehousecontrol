#!/bin/bash
# Deploy updates. Safe on servers running other apps — only restarts warehousecontrol.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/warehousecontrol}"
cd "$APP_DIR"

git pull origin main

PORT="$(grep '^PORT=' .env | cut -d= -f2 | tr -d '"')"
if [ -z "$PORT" ]; then
  echo "ERROR: PORT not set in .env" >&2
  exit 1
fi

sed "s/\${PORT}/${PORT}/g" deploy/ecosystem.config.cjs.template > ecosystem.config.cjs

if [ -f package-lock.json ]; then
  npm ci || npm install
else
  npm install
fi
npm run build
npm run db:push

sudo -u www-data env HOME="$APP_DIR" PM2_HOME="$APP_DIR/.pm2" pm2 restart warehousecontrol

echo "Deployed $(git rev-parse --short HEAD) on port ${PORT}"
