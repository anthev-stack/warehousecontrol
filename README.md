# Warehouse Control

Manufacturing ERP for parts, products, assemblies, work orders, purchasing, and inventory. Built with Next.js, Prisma, and SQLite.

## Local development

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000

Demo logins (password `demo123`):

- `admin@demo.com`
- `production@demo.com`
- `purchasing@demo.com`
- `user@demo.com`

## Production (Vultr + warehousecontrol.cc)

Designed to run **alongside other apps** on the same server:

- Does **not** remove or replace existing nginx sites
- Uses its **own port** (3001+ if 3000 is taken)
- Adds only a **warehousecontrol.cc** nginx vhost
- PM2 process name: `warehousecontrol` (won't touch other PM2 apps)

### Setup

1. Point DNS for `warehousecontrol.cc` and `www.warehousecontrol.cc` to your Vultr server IP.
2. SSH in and run:

```bash
git clone https://github.com/anthev-stack/warehousecontrol.git /var/www/warehousecontrol
cd /var/www/warehousecontrol
sudo bash deploy/setup-vultr.sh
```

Optional — force a specific port if you know what's free:

```bash
sudo WAREHOUSECONTROL_PORT=3002 bash deploy/setup-vultr.sh
```

3. After DNS propagates, enable HTTPS for this domain only:

```bash
sudo certbot --nginx -d warehousecontrol.cc -d www.warehousecontrol.cc
```

4. Future updates:

```bash
sudo bash /var/www/warehousecontrol/deploy/deploy.sh
```

### Environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite path, e.g. `file:/var/www/warehousecontrol/data/prod.db` |
| `AUTH_SECRET` | Long random string for session JWT signing |
| `NODE_ENV` | `production` |
| `PORT` | Local port nginx proxies to (auto-picked, usually 3001) |

## Repository

https://github.com/anthev-stack/warehousecontrol
