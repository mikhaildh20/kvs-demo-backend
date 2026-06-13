# Agent Notes — KVS Backend

Always read `docs/PROJECT_CONTEXT.md` before making KVS backend changes.

This repo is the backend half of the KVS / Kanban Verification System project.
Keep this context separate from Karsa Home, Portfolio, and Hermes Dashboard.

Rules:

- Runtime is PostgreSQL, not SQL Server.
- Do not commit `.env` or secrets.
- Do not print real credentials in chat or logs.
- Use systemd + Nginx deployment conventions.
- Keep service compatible with non-root runtime user `kvsdemo`.
- Keep CORS restricted to the KVS frontend domain unless the user explicitly expands it.
- Keep Excel import `.xlsx` only and use `exceljs`, not the vulnerable `xlsx` package.
- Keep model files on Prisma ORM/client methods; do not reintroduce `$queryRaw`/`$executeRaw` in `models/*.model.js` unless explicitly approved.
- Verify with backend smoke test and `npm audit` before reporting success.
