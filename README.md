# BH-Farm-OS

> A full-stack farm management platform for Boroma Hills Farm, designed to bring livestock, inventory, tasks, finances, alerts, and day-to-day farm operations into one operational workspace.

BH-Farm-OS is a production-oriented agricultural management application built around the needs of a working farm in Zimbabwe. It provides a single interface for monitoring farm activity and managing operational records across livestock, poultry, inventory, finance, tasks, farm zones, and alerts.

## What it manages

- **Farm dashboard** — operational overview, livestock counts, inventory warnings, tasks, alerts, and financial summaries
- **Daily operations** — today's work and outstanding operational tasks
- **Farm zones** — structured farm-area information for operational planning
- **Livestock** — goat records, health and pregnancy status, paddocks, and poultry flock tracking
- **Inventory** — stock levels, minimum/maximum thresholds, suppliers, storage locations, and stock transactions
- **Tasks** — priorities, due dates, recurrence, assignment, completion, and notes
- **Finance** — income and expense records with farm-unit summaries and profitability calculations
- **Alerts** — operational warnings such as upcoming kidding dates, vaccination requirements, and low inventory
- **Search** — search across farm records from a unified interface

## Technology stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Radix UI primitives
- TanStack React Query
- React Hook Form
- Zod
- Recharts
- Wouter
- Framer Motion
- Lucide React

### Backend

- Node.js
- Express 5
- TypeScript
- Pino / pino-http for structured HTTP logging
- CORS
- Zod-based request/response validation

### Data layer

- PostgreSQL
- Drizzle ORM
- drizzle-zod
- `pg` Node.js PostgreSQL driver

### Infrastructure

- pnpm workspaces
- Docker
- Render deployment configuration
- Shared TypeScript packages for API contracts and database access

## Architecture

The repository is organized as a TypeScript monorepo so the web application, API, database layer, and shared contracts can evolve together.

```text
BH-Farm-OS/
├── artifacts/
│   ├── bh-farm-os/          # React + Vite web application
│   ├── api-server/          # Express API
│   └── mockup-sandbox/      # UI/prototyping workspace
├── lib/
│   ├── api-client-react/    # Shared frontend API client
│   ├── api-spec/            # API contract definitions
│   ├── api-zod/             # Runtime validation schemas
│   └── db/                  # Drizzle/PostgreSQL database layer
├── scripts/                 # Repository tooling
├── Dockerfile
├── render.yaml
├── pnpm-workspace.yaml
└── package.json
```

### Request flow

```text
React UI
   │
   │ HTTP / JSON
   ▼
Express API
   │
   ├── Zod validation
   │
   ├── Farm domain logic
   │
   ▼
Drizzle ORM
   │
   ▼
PostgreSQL
```

Shared API and validation packages help keep the frontend and backend contracts aligned while the database package centralizes schema and data access.

## Data model

The current database layer includes core entities for:

- Farm zones
- Farm tasks
- Goats
- Poultry flocks
- Inventory items
- Inventory transactions
- Finance transactions

The schema uses PostgreSQL types through Drizzle ORM and exposes inferred TypeScript types alongside the table definitions.

## Getting started

### Prerequisites

- Node.js 24+
- pnpm
- PostgreSQL

### Install dependencies

```bash
corepack enable
pnpm install
```

### Configure the database

Set `DATABASE_URL` to a PostgreSQL connection string available to the application.

For example:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/bh_farm_os
```

The API uses port `5000` by default and can be configured with `PORT`.

For the frontend, `VITE_API_URL` can be used when the API is hosted separately from the Vite application.

> Never commit real database credentials, API keys, or other secrets to the repository.

### Database schema

The database package provides Drizzle commands for applying the current schema:

```bash
pnpm --filter @workspace/db run push
```

Use `push-force` only when you understand the schema changes being applied.

### Run the frontend

```bash
pnpm --filter @workspace/bh-farm-os run dev
```

### Run the API

```bash
pnpm --filter @workspace/api-server run dev
```

### Type-check the workspace

```bash
pnpm run typecheck
```

### Build

```bash
pnpm run build
```

## Deployment

The repository includes a Docker-based deployment configuration for the API and a Render service definition.

The API container:

1. Uses Node.js 24 on Debian Bookworm Slim.
2. Installs workspace dependencies with a frozen pnpm lockfile.
3. Builds the API server.
4. Runs the compiled server in a production runtime image.
5. Exposes port `5000`.

The Render configuration defines a Docker web service named `bh-farm-api`, enables automatic deployment, and expects `DATABASE_URL` to be supplied as an environment variable.

## Engineering highlights

BH-Farm-OS demonstrates several patterns that are useful in real-world full-stack applications:

- **Monorepo architecture** for keeping application, API, database, and shared packages together
- **End-to-end TypeScript** across the frontend and backend
- **Runtime validation with Zod** at API boundaries
- **Typed PostgreSQL access with Drizzle ORM**
- **Shared API contracts** between client and server
- **Operational dashboards** built around real domain data rather than generic CRUD screens
- **Business rules in the API**, including stock threshold checks, inventory quantity protection, task completion, and financial aggregation
- **Structured logging** with Pino
- **Containerized deployment** with Docker
- **Production-oriented configuration** for Render

## Project status

BH-Farm-OS is an active farm-management application and is being developed around practical agricultural operations at Boroma Hills Farm.

The architecture is intentionally modular so additional farm enterprises, operational workflows, analytics, integrations, and automation can be added without restructuring the entire application.

## Roadmap ideas

Potential areas for future expansion include:

- Role-based access and farm staff permissions
- More detailed livestock health and treatment histories
- Crop and orchard management
- Water and irrigation monitoring
- Farm document and attachment management
- Offline-first workflows for low-connectivity environments
- Notifications and scheduled reminders
- More advanced financial reporting
- Production analytics and historical trend dashboards
- Mobile/PWA support for field operations

## Repository

Built with TypeScript, React, Node.js, PostgreSQL, and a focus on practical farm operations in Zimbabwe.
