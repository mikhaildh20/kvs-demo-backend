# Project Context — KVS / Kanban Verification System

## Scope

This context is for the KVS demo project only. Keep backend and frontend decisions together under this project context so they do not mix with Karsa Home, Portfolio, or Hermes Dashboard work.

KVS stands for Kanban Verification System. It is the demo continuation of the original WMS/Kanban work and covers verification workflows around OQC, Double Check, Barcode Delivery Scan, and related master data.

## Repositories

- Backend source migration target: `mikhaildh20/kvs-demo-backend`
- Frontend source migration target: `mikhaildh20/kvs-demo-frontend`
- Original backend source copied from: `mikhaildh20/wms_backend`
- Original frontend source copied from: `mikhaildh20/wms-frontend`

## Server Paths

- Backend: `/opt/projects/kvs-demo-backend`
- Frontend: `/opt/projects/kvs-demo-frontend`

## Runtime

- Backend service: `kvs-demo-backend.service`
- Frontend service: `kvs-demo-frontend.service`
- Backend internal port: `5000`
- Frontend internal port: `3001`
- Runtime user: `kvsdemo`
- Reverse proxy: Nginx
- Deployment style: systemd + Nginx, not PM2

## Public URLs

- Frontend: `https://kvs-demo.karsa-dev.my.id`
- API: `https://kvs-demo-api.karsa-dev.my.id`

## Database

- DBMS: PostgreSQL
- Database: `kvs_demo_backend`
- The backend was migrated from SQL Server-style usage to PostgreSQL.
- Do not reintroduce SQL Server assumptions, SQL Server connection strings, or SQL Server-specific syntax unless explicitly requested.

## Environment Files

- Backend real env: `/opt/projects/kvs-demo-backend/.env`
- Frontend real env: `/opt/projects/kvs-demo-frontend/.env.local`
- Safe examples only: `.env.example`
- Never commit or display real env values, tokens, passwords, JWT secrets, DB passwords, or connection strings.
- `env.zip` from the user contained backend and frontend env files. It is project-specific to KVS.
- If an uploaded env contains old SQL Server `DATABASE_URL`, keep the PostgreSQL `DATABASE_URL` on the VPS unless the user explicitly wants a new DB target.

## Security Baseline

Current hardening expectations:

- Backend runs as non-root `kvsdemo`.
- systemd hardening enabled: `NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome`, `PrivateTmp`.
- CORS is restricted to `https://kvs-demo.karsa-dev.my.id`.
- Bad CORS origins should return `403`.
- `helmet` is enabled.
- `x-powered-by` is disabled.
- Auth routes are rate-limited.
- General API routes are rate-limited.
- JSON body limit is `1mb`.
- Upload max size is `10MB`.
- Upload static serving denies dotfiles and directory indexing.
- Excel upload support is `.xlsx` only.
- Do not use the vulnerable `xlsx` package; use `exceljs` helper utilities.
- `npm audit --omit=dev --audit-level=moderate` should show `0 vulnerabilities` for backend and frontend.

## Important Functional Areas

- Authentication and user session
- Role/menu access
- Master data: users, roles, menus, colors, customers, suppliers, lines, matrix, QR formats
- Kanban import and management
- OQC label/QR workflows
- Double Check workflows
- Barcode Delivery Scan workflows
- Report/detail pages
- Uploads and generated assets under backend-controlled paths

## Verification Checklist

Before reporting KVS work as done, verify:

1. Backend service is active.
2. Frontend service is active.
3. Nginx is active and config is valid.
4. Frontend login page returns HTTP 200.
5. API root returns HTTP 200.
6. Login works with the current seeded/admin credential available on the server or provided by the user.
7. API smoke test passes core endpoints.
8. `npm audit` passes for backend and frontend.
9. No real `.env` files or secrets are staged/committed.

Known good smoke target count from prior verification: `20/20` endpoints.

## Context Boundaries

When the user says switch to KVS context, focus only on:

- `/opt/projects/kvs-demo-backend`
- `/opt/projects/kvs-demo-frontend`
- `kvs_demo_backend`
- `kvs-demo.karsa-dev.my.id`
- `kvs-demo-api.karsa-dev.my.id`

Do not mix in Karsa Home content edits unless the user asks to expose/link KVS from the homepage.
Do not mix in Portfolio content unless explicitly requested.
Do not mix in Hermes Dashboard config unless explicitly requested.
