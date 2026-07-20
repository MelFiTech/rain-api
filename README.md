# Rain API

NestJS backend for the Monnify hackathon demo. Serves the developer API (`/v1`) and the built-in Rain admin UI at `/admin`.

## Prerequisites

- Node.js 20 or newer
- PostgreSQL (Neon is fine)

## Setup

1. Install dependencies.

```bash
npm install
cd admin-ui && npm install && cd ..
```

2. Copy the env template and fill in values.

```bash
cp .env.example .env
```

Set at minimum: `DATABASE_URL`, `JWT_SECRET`, and Monnify sandbox keys if you need wallet funding or payouts.

3. Create the schema and seed demo data.

```bash
npm run db:setup
```

4. Build the admin UI (served from this API).

```bash
npm run admin:build
```

5. Start the API.

```bash
npm run start:dev
```

Default port is **9090** (`PORT` in `.env`).

## Local URLs

| What | URL |
|------|-----|
| API base | http://localhost:9090 |
| Health | http://localhost:9090/health |
| Swagger | http://localhost:9090/swagger |
| Platform admin UI | http://localhost:9090/admin/ |
| Developer API | http://localhost:9090/v1/... |

Admin UI hot reload (proxies to the API): `npm run admin:dev` from the repo root.

## Demo accounts (after seed)

Platform admin (`/admin`):

- Email: `admin@userain.co`
- Password: `Password@123`

PayNest:

- Email: `compliance@paynest.ng`
- Password: `password123`

Developer API key (PayNest):

- `rain_live_demo_development_key`  
- Header: `Authorization: Bearer rain_live_demo_development_key`

## Auth overview

| Surface | Prefix | How to authenticate |
|---------|--------|---------------------|
| Developer API | `/v1/*` | Bearer API key |
| Institution app API | `/platform/*` | JWT from `POST /platform/auth/login` |
| Rain admin API | `/platform/admin/*` | JWT; user must have `isPlatformAdmin` |
| Health | `GET /health` | None |

## Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run start:dev` | API with watch mode |
| `npm run db:push` | Apply Prisma schema only |
| `npm run db:seed` | Seed demo data only |
| `npm run db:setup` | Push schema + seed |
| `npm run admin:build` | Build admin UI into `public/admin` |
| `npm run build` | Admin UI + Nest production build |

## Project layout

```
src/
  modules/       Feature modules (auth, verifications, wallet, platform-admin, …)
  providers/     Payments (Monnify), email, webhooks
  storage/       Prisma repositories
prisma/          Schema and seed
admin-ui/        Vite React platform admin (basename /admin)
public/admin/    Built admin static files (generated)
```

## Monnify (wallet top-ups)

Sandbox credentials go in `.env` (`MONNIFY_*`). Wallet funding fee and pricing live in app config (seeded; adjustable via platform config API). For webhooks, point Monnify to `POST /webhooks/monnify` on your public API URL when you deploy.
