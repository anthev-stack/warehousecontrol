#!/bin/bash
# Deploy updates after the initial setup-vultr.sh run.
set -euo pipefail

APP_DIR="/var/www/warehousecontrol"
cd "$APP_DIR"

git pull origin main
npm ci
npm run build
npm run db:push

sudo -u www-data env HOME="$APP_DIR" pm2 restart warehousecontrol

echo "Deployed $(git rev-parse --short HEAD)"
