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

1. Create a Vultr Ubuntu 22.04/24.04 server.
2. Point DNS for `warehousecontrol.cc` and `www.warehousecontrol.cc` to the server IP (A records).
3. SSH into the server and run:

```bash
curl -fsSL https://raw.githubusercontent.com/anthev-stack/warehousecontrol/main/deploy/setup-vultr.sh | bash
```

Or clone first, then run `sudo bash deploy/setup-vultr.sh`.

4. After DNS propagates, enable HTTPS:

```bash
sudo certbot --nginx -d warehousecontrol.cc -d www.warehousecontrol.cc
```

5. Future updates:

```bash
sudo bash /var/www/warehousecontrol/deploy/deploy.sh
```

### Environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite path, e.g. `file:/var/www/warehousecontrol/data/prod.db` |
| `AUTH_SECRET` | Long random string for session JWT signing |
| `NODE_ENV` | `production` |
| `PORT` | `3000` (nginx proxies to this) |

## Repository

https://github.com/anthev-stack/warehousecontrol
