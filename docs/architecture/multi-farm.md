# Camluk Farm OS multi-farm architecture

Camluk Farm OS is a reusable farm-management platform. Each farm is an independent tenant; Boroma Hills is the first production farm to be onboarded.

## Tenant boundary

- `farms` is the first-class tenant entity.
- Operational tables carry `farmId` so records can be scoped to a farm.
- Users can belong to multiple farms through `auth_user_farms`.
- A user's role is assigned per farm membership.
- Section access is scoped to both user and farm.
- Sessions can carry an active farm context.
- Audit events can be associated with a farm.

## Current enforcement

- Authenticated farm routes require an active farm context before reaching operational routers.
- Core task, goat, poultry, inventory, finance, search and flexible-operation reads and writes are scoped by the active farm.
- Dashboard, livestock summary, alerts and zones are scoped by the active farm.
- Demo data is scoped by the active farm and cannot be deleted from another farm.
- Inventory transactions carry both the owning farm and inventory-item relationship.
- Auth relationships now use database foreign keys for users, roles, permissions, memberships, sections, sessions and audit records.

## Migration safety

Operational `farmId` columns are currently nullable. This is deliberate: existing records must not be silently attributed to a farm and historical data must not be fabricated. New application writes require an active farm and populate `farmId`. A controlled migration/backfill must explicitly map legacy records to a confirmed tenant before ownership becomes mandatory.

## Platform-global vs farm-scoped

Platform-global:

- Roles
- Permissions
- Section definitions
- Product-level configuration

Farm-scoped:

- Farm profile and settings
- Users' farm memberships and per-farm roles
- Section assignments within a farm
- Zones and tasks
- Goats and poultry
- Inventory and inventory transactions
- Finance transactions
- Flexible operational records
- Farm audit context

## Remaining P0 verification

1. Run the database schema update and confirm the new foreign keys/indexes apply cleanly to the existing database.
2. Confirm the production tenant mapping for legacy `NULL farmId` records before backfilling them.
3. Add automated cross-farm integration tests covering reads, writes, updates, deletes, aggregates and search.
4. After verified backfill, make operational `farmId` columns non-null where appropriate.
5. Verify a second farm can be created, assigned, selected and used without code changes.

## P1 authentication verification

The authentication layer provides platform bootstrap, password login/logout, persistent sessions, per-farm memberships, active-farm selection, five farm roles plus platform administration, section assignments, permission checks and security audit events. Production cookies use secure cross-site session settings and API CORS is controlled through `FRONTEND_URL`.

Remaining verification is end-to-end production testing: bootstrap, login, logout, role/section matrix, disabled-user rejection, farm switching and Vercel-to-Render session persistence.
