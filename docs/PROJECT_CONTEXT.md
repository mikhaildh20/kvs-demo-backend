# Project Context — KVS / Kanban Verification System

## Purpose

KVS is the Kanban Verification System demo project. Keep backend and frontend decisions together under this context so they do not mix with Karsa Home, Portfolio, or Hermes Dashboard work.

It covers OQC, Double Check, Barcode Delivery Scan, Kanban import, reports, and related master data verification workflows.

## Repos / Paths

- Backend repo: `mikhaildh20/kvs-demo-backend`
- Frontend repo: `mikhaildh20/kvs-demo-frontend`
- Backend path: `/opt/projects/kvs-demo-backend`
- Frontend path: `/opt/projects/kvs-demo-frontend`
- Original backend source copied from: `mikhaildh20/wms_backend`
- Original frontend source copied from: `mikhaildh20/wms-frontend`

## Runtime

- Backend service: `kvs-demo-backend.service`
- Frontend service: `kvs-demo-frontend.service`
- Backend internal port: `5000`
- Frontend internal port: `3001`
- Runtime user: `kvsdemo`
- Reverse proxy: Nginx
- Deployment pattern: systemd + Nginx, not PM2

## URLs

- Frontend: `https://kvs-demo.karsa-dev.my.id`
- API: `https://kvs-demo-api.karsa-dev.my.id`
- Karsa Home card image:
  - `/opt/projects/karsa-home/public/assets/kvs-preview.svg`
  - Public path: `/home-assets/kvs-preview.svg`

## Database

- DBMS: PostgreSQL
- Database: `kvs_demo_backend`
- This project was migrated from SQL Server-style usage to PostgreSQL.
- Do not reintroduce SQL Server connection strings, SQL Server assumptions, or SQL Server-specific syntax unless explicitly requested.

## Environment Files

- Backend real env: `/opt/projects/kvs-demo-backend/.env`
- Frontend real env: `/opt/projects/kvs-demo-frontend/.env.local`
- Safe examples only: `.env.example`
- Never commit or display real env values, tokens, passwords, JWT secrets, DB passwords, or connection strings.
- User-provided `env.zip` belonged to KVS and contained backend/frontend env files.
- If env input contains old SQL Server `DATABASE_URL`, keep the working PostgreSQL `DATABASE_URL` unless the user explicitly changes DB target.

## Security Baseline

Expected current baseline:

- Backend runs as non-root `kvsdemo`.
- systemd hardening: `NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome`, `PrivateTmp`.
- CORS restricted to `https://kvs-demo.karsa-dev.my.id`.
- Bad CORS origins return `403`.
- `helmet` enabled.
- `x-powered-by` disabled.
- Auth routes rate-limited.
- General API routes rate-limited.
- JSON body limit: `1mb`.
- Upload max size: `10MB`.
- Static uploads deny dotfiles and directory indexing.
- Excel upload support: `.xlsx` only.
- Use `exceljs`; do not use vulnerable `xlsx` package.
- `npm audit --omit=dev --audit-level=moderate` should return `0 vulnerabilities` for backend and frontend.

## Backend Data Access

- Backend model files should use Prisma ORM/client methods (`findMany`, `findFirst`, `create`, `update`, `updateMany`, `count`, relations/includes/selects`).
- Do not use raw SQL in model files: `$queryRaw`, `$queryRawUnsafe`, `$executeRaw`, or `$executeRawUnsafe`.
- Keep `model-orm-refactor.test.js` as a guard so raw SQL does not get reintroduced into `models/*.model.js`.
- If a query becomes too complex, prefer a Prisma relation/include/select helper or a service-level aggregation before falling back to raw SQL; raw SQL requires explicit user approval and context update.

## Functional Areas

- Authentication/session
- Role/menu access
- Master data: users, roles, menus, colors, customers, suppliers, lines, matrix, QR formats
- Kanban import and management
- OQC labels/QR workflow
- Double Check workflow
- Barcode Delivery Scan workflow
- Reports/detail pages
- Upload/generated assets

## RBAC / Menu Rules

- `mst_menus` and `detail_menu` store page paths only, for example `/pages/menu` or `/pages/group-menu/detail`.
- Do not add `/api/*` rows to `mst_menus` or `detail_menu`.
- Protected API endpoints must resolve to the matching page menu path in the backend path resolver, currently `utils/path.js`.
- Dynamic frontend paths such as `/pages/group-menu/detail/{encryptedId}` normalize to the static menu path `/pages/group-menu/detail` before access checks.
- Administrator should have every active page menu in `detail_menu`.
- New or reactivated menu rows should auto-grant Administrator access so the admin role does not get locked out after menu maintenance.
- Auth/profile pages are not normal menu RBAC entries.

## Data Import Rules

- SQL Server dump imports should parse tuples only after the `VALUES` keyword.
- Preserve meaningful fixed-width/char whitespace, especially for matrix data.
- Imported menu data must still follow the page-path-only RBAC rule above.

## Brand / Naming Boundary

- KVS frontend branding uses NLA / Nusantara Lighting Automotive text and `/images/logoNLA.png`.
- Portfolio work-history naming is separate; do not change portfolio company names when the user asks for KVS branding text.

## Verification Checklist

Before reporting KVS work as done:

1. Backend service active.
2. Frontend service active.
3. Nginx active and config valid.
4. Frontend login page HTTP 200.
5. API root HTTP 200.
6. Login works with current server/user credential context.
7. Core API smoke test passes. Known good count: `20/20`.
8. Backend and frontend `npm audit` pass.
9. No real `.env` files or secrets are staged/committed/printed.

## Context Boundary

When the user says KVS context, focus only on:

- `/opt/projects/kvs-demo-backend`
- `/opt/projects/kvs-demo-frontend`
- PostgreSQL database `kvs_demo_backend`
- `https://kvs-demo.karsa-dev.my.id`
- `https://kvs-demo-api.karsa-dev.my.id`

Do not modify Karsa Home except when the user asks to expose/link KVS from the homepage.
Do not modify Portfolio or Hermes Dashboard unless explicitly requested.
