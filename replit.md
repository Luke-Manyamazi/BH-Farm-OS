# BH Farm OS

BH Farm OS is a mobile-first operations dashboard for Boroma Hills Farm in Zimbabwe, covering livestock, tasks, inventory, water, alerts, search, and farm finance.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/bh-farm-os/src/pages/farm-pages.tsx` — app pages and operational forms.
- `artifacts/bh-farm-os/src/components/farm-shell.tsx` — responsive navigation and application shell.
- `artifacts/api-server/src/routes/farm.ts` — API handlers for dashboard, tasks, livestock, inventory, finance, alerts, zones, and search.
- `artifacts/api-server/src/lib/farm-data.ts` — seed records and response mapping.
- `lib/db/src/schema/farm.ts` — Drizzle schema for farm records.
- `lib/api-spec/openapi.yaml` — source of truth for API contracts.
- `artifacts/bh-farm-os/src/index.css` — shared BH Farm OS visual theme.

## Architecture decisions

- The first release prioritizes daily farm operations: dashboard, today checklist, zones, livestock, inventory, finance, alerts, search, and working create/complete/transaction flows.
- Seed records are explicitly labeled as sample data in the UI and are designed to be replaced by live farm entries.
- Farm modules use normalized PostgreSQL tables and the OpenAPI contract generates both the frontend hooks and server validators.
- API integer-like values use numeric OpenAPI schemas for compatibility with the current shared Zod/Orval toolchain.

## Product

Users can see the farm at a glance, complete recurring daily work, inspect goats and poultry batches, monitor stock and water, record inventory movements, review sample profitability, search records, and act on alerts from desktop or phone.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Regenerate API hooks after changing `lib/api-spec/openapi.yaml` with `pnpm --filter @workspace/api-spec run codegen`.
- Run `pnpm run typecheck:libs` after changing shared database or generated API packages.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
