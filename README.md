# Rain API

NestJS backend for the Monnify hackathon demo. Serves the developer API (`/v1`) and the built-in Rain admin UI at `/admin`.

The **institution dashboard** is a separate app: **[rain-web](https://github.com/MelFiTech/rain-web)** (Next.js). Point it at this API with `NEXT_PUBLIC_API_URL`. Platform operators use `/admin` on this service; member institutions use rain-web.

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

For **Railway production**, use `.env.prod.example` as a checklist, copy values into `.env.prod` (gitignored), then paste into Railway → Variables. See `.env.prod.example` and the Monnify section below.

Set at minimum: `DATABASE_URL`, `JWT_SECRET`, and Monnify sandbox keys (`MONNIFY_API_KEY`, `MONNIFY_SECRET_KEY`, `MONNIFY_CONTRACT_CODE`, `MONNIFY_WALLET_ACCOUNT_NUMBER` for payouts). See `.env.example` for every variable (webhooks, fees, email, earnings worker).

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

### Sample verifications (after seed)

Log in as PayNest and run a verification (or `POST /platform/verifications`) with these identifiers — each has cross-institution reports in the network:

| Use case | `identifierType` | `identifier` | Expected |
|----------|------------------|----------------|----------|
| Strong BVN match | `bvn` | `12345678901` | match (3 sources, medium) |
| **High alert BVN** | `bvn` | `77665544332` | match (5 sources, **high**) |
| **Critical alert BVN** | `bvn` | `99887766554` | match (10 sources, **very high**) |
| **Critical alert NIN** | `nin` | `55667788990` | match (10 sources, **very high**) |
| Peer BVN sample | `bvn` | `22222222222` | match (2 sources) |
| Phone match | `phone` | `08081234567` | match (2 sources) |
| Email match | `email` | `scam@example.com` | match (2 sources) |
| Account match | `account_number` | `0123456789` | match (2 sources) |
| No network signal | `nin` | `11111111111` | no_match |

Verification responses (`/v1/verifications`, `/platform/verifications`) include a **`recommendation`** object: `action` (`proceed` \| `review` \| `decline`), `severity`, `title`, and `summary` — for dashboard and API consumers.

Re-seed: `npm run db:seed`

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

## Monnify

Sandbox credentials go in `.env` (`MONNIFY_*`). Wallet funding fee and pricing live in app config (seeded; adjustable via platform config API).

### Monnify products (hackathon / integration scope)

What Rain uses versus Monnify’s product checklist:

| Product | Used? | Role in Rain |
|---------|-------|----------------|
| **Checkout API** | Yes | Institution wallet funding: init transaction, checkout URL, bank-transfer details, transaction status polling |
| **Single transfer** (Single/Bulk Transfer) | Yes | Earnings withdrawal to the institution’s settlement bank (`/api/v2/disbursements/single`) — **bulk transfer not used** |
| **Other** | Yes | Disbursement wallet balance, NIP account validation (Settings settlement bank), collection + disbursement webhooks |
| Customer Reserved Account | No | Funding uses checkout + **short-lived** transfer account, not a standalone reserved-account product |
| Invoice | No | — |
| Direct Debit | No | — |
| Subaccount | No | — |
| Refunds | No | Refund webhooks may be acknowledged later; no refund API integrated |
| Bills Payment | No | — |

Implementation reference (`src/providers/payments/monnify/monnify-api.client.ts`):

- Collections: `POST /api/v1/merchant/transactions/init-transaction`, `POST /api/v1/merchant/bank-transfer/init-payment`, `GET /api/v2/transactions/{reference}`
- Disbursements: `POST /api/v2/disbursements/single`, `GET /api/v2/disbursements/single/summary`, `GET /api/v2/disbursements/wallet-balance`, `GET /api/v2/disbursements/account/validate`

### Webhook URL (Monnify Developer → Webhook URLs)

Use the same HTTPS URL for each field that applies:

```text
https://rain-api-production.up.railway.app/webhooks/monnify
```

| Monnify field | Used for |
|---------------|----------|
| Transaction completion | Wallet funding (`SUCCESSFUL_TRANSACTION`) |
| Disbursement | Earnings bank payouts |
| Refund / settlement | Logged; extend handlers if needed |

The API responds with **HTTP 200** immediately, then processes the event asynchronously. Duplicate notifications are ignored via a dedupe store.

### Webhook security (env)

| Variable | Purpose |
|----------|---------|
| `MONNIFY_SECRET_KEY` | HMAC-SHA512 verification of `monnify-signature` (production/live) |
| `MONNIFY_WEBHOOK_ALLOWED_IPS` | Default `35.242.133.146` (Monnify) |
| `MONNIFY_WEBHOOK_ENFORCE_IP` | `true` in production by default; set `false` for sandbox testing |
| `MONNIFY_WEBHOOK_REQUIRE_SIGNATURE` | Optional; sandbox webhooks often have no signature header |

Sandbox: signatures are usually omitted; keep `MONNIFY_BASE_URL` on sandbox and `MONNIFY_WEBHOOK_ENFORCE_IP=false` if needed. Live Monnify: use live keys, enforce IP, signatures required automatically when not on sandbox.
