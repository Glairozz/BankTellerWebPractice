# 🏦 SecureBank — Bank Teller & Online Banking System

A complete, production-grade rewrite of `BankTellerWebPractice` (formerly a vanilla
JS + LocalStorage demo). This is a modern, enterprise-style banking application built
with clean architecture, ACID-compliant transactions, RBAC security, and a sleek
financial dashboard UI.

## ✨ Highlights

- **Monorepo** with an Express + TypeScript REST API and a React (Vite) + Tailwind SPA.
- **ACID-compliant money movement** — deposits, withdrawals, and transfers run in
  single PostgreSQL transactions at `SERIALIZABLE` isolation with row-level locking
  (`SELECT … FOR UPDATE`) and optimistic-concurrency guards.
- **Role-Based Access Control** — `CUSTOMER`, `TELLER`, `ADMIN`.
- **Enterprise security** — Argon2 password hashing, JWT in httpOnly cookies with
  server-side revocation, Zod end-to-end validation, Helmet, CORS, and rate limiting.
- **Full audit trail** — every sensitive operation (login, deposits, withdrawals,
  transfers, balance adjustments, approvals) is written to an immutable `audit_logs`
  table.
- **High-value transfer approvals** — transfers above a threshold enter a PENDING
  approval workflow reviewed by a teller/admin.
- **Modern UI/UX** — dark financial dashboard, Shadcn-style components (Radix UI +
  Tailwind), Lucide icons, TanStack Query for data fetching, Zustand for client state.

## 📦 Tech Stack

| Layer       | Technology                                                              |
| ----------- | ----------------------------------------------------------------------- |
| Frontend    | React 18, Vite, TypeScript                                              |
| Styling/UI  | Tailwind CSS, Radix UI, Lucide, class-variance-authority                |
| Data fetch  | TanStack Query (React Query)                                            |
| State       | Zustand                                                                 |
| Backend     | Node.js + Express 4, TypeScript                                         |
| Database    | PostgreSQL 16 + Prisma ORM                                              |
| Validation  | Zod (shared across API boundary)                                        |
| Auth        | JWT httpOnly cookie, Argon2id, RBAC middleware                          |
| Ops         | Docker Compose (Postgres), Git pre-push, Vitest (planned)               |

## 🗂 Architecture

```
.
├── apps/
│   ├── api/                    # Express + Prisma backend (port 4000)
│   │   ├── prisma/             # schema.prisma, migrations, seed.ts
│   │   └── src/
│   │       ├── config/         # env & business-rule config
│   │       ├── controllers/    # HTTP layer (request/response)
│   │       ├── services/       # business logic (ACID transactions)
│   │       ├── routes/         # route definitions + RBAC guards
│   │       ├── middleware/     # auth, rate-limit, error handling
│   │       ├── validation/     # Zod schemas
│   │       ├── lib/            # prisma, token, audit, money utils
│   │       └── types/          # express request augmentation
│   └── web/                    # React + Vite SPA (port 5173)
│       └── src/
│           ├── components/     # ui/ primitives + feature components
│           ├── lib/            # api client, utils
│           ├── stores/         # Zustand stores
│           ├── types/          # shared domain types
│           └── features/       # customer + teller portals
├── docker-compose.yml          # PostgreSQL 16 service
└── package.json                # npm workspaces root
```

## 🚀 Getting Started

Prerequisites: **Node 20+**, **Docker** (for PostgreSQL).

```bash
# 1. Install dependencies (workspace root)
npm install

# 2. Start PostgreSQL
docker compose up -d db

# 3. Configure the API env
cp apps/api/.env.example apps/api/.env   # then edit JWT_SECRET

# 4. Create the database schema & seed demo data
npm run db:migrate
npm run db:seed

# 5. Run both apps (API + Web) in watch mode
npm run dev
```

- API → http://localhost:4000
- Web  → http://localhost:5173

> Vite proxies `/api` to the backend, so the UI works without manual CORS config.

### Seed Accounts

| Role     | Email                    | Password        |
| -------- | ------------------------ | --------------- |
| Admin    | `admin@securebank.dev`   | `Admin@1234`    |
| Teller   | `teller@securebank.dev`  | `Teller@1234`   |
| Customer | `customer@securebank.dev`| `Customer@1234` |

## 🧩 Core Business Logic

The heart of the system is `apps/api/src/services/transaction.service.ts`. All money
operations use interactive Prisma transactions at the **SERIALIZABLE** isolation
level and lock account rows with `SELECT … FOR UPDATE` to prevent race conditions:

- **`deposit`** — locks the account, credits it, creates a `DEPOSIT` record + audit log.
- **`withdraw`** — locks the account, verifies sufficient funds, debits it.
- **`transfer`** — locks **both** accounts in deterministic order (avoiding deadlocks),
  verifies currency match + funds, performs a dual-entry update. High-value transfers
  (> `$10,000`) become `PENDING` and require a teller/admin approval.
- **`adjustBalance`** — a heavily-audited teller/admin correction with a mandatory reason.
- **`approveTransaction`** — re-checks funds at approval time and commits atomically.

**Idempotency keys** are supported on all money endpoints so a client retry can never
double-charge.

## 🔐 Security & Compliance

- Argon2id password hashing (high memory cost).
- Main app in httpOnly, `SameSite=Lax` cookies → not readable by JS, mitigating XSS.
- JWT has a `jti` stored server-side; tokens can be individually revoked (logout revokes all).
- Zod validation on every endpoint; SQL injection is impossible via Prisma's
  parameterized queries.
- Rate limiting on auth and money-transfer routes.
- Full `audit_logs` trail for compliance forensics.
- Password rules enforced (uppercase + digit + min 8 chars).

## 🛣 Migration & Development Roadmap

1. **Phase 0 — Scaffold** (done): monorepo, Docker, Prisma schema, Express API skeleton.
2. **Phase 1 — Core backend** (done): auth, accounts, ACID transactions, audit, RBAC.
3. **Phase 2 — Frontend foundation**: design system (done), API client, auth store,
   customer portal, teller workstation.
4. **Phase 3 — Hardening**: statement PDF export, email/2FA, refresh-token rotation,
   Redis-backed rate limiting, end-to-end tests, CI/CD (GitHub Actions), Dockerized app.
5. **Phase 4 — Scale**: sharding/read replicas, event-sourced ledger, idempotency at the
   API gateway, horizontal scaling behind a load balancer.

See `docs/ROADMAP.md` for the detailed step-by-step guide.

## 📄 License

Demonstration / educational project. Not intended for real financial use without
professional security review.
