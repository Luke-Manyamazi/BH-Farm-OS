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

## Migration safety

Operational `farmId` columns are initially nullable. This is deliberate: existing records must not be silently attributed to a farm and historical data must not be fabricated. The next migration step must explicitly map existing records to a confirmed tenant before ownership becomes mandatory.

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

## Required next steps

1. Add a controlled data migration/backfill for existing records after confirming the first farm tenant.
2. Introduce an active-farm context in the API authentication layer.
3. Make every read, write, aggregate, search and report require the active farm context.
4. Add cross-farm integration tests.
5. Only then make operational `farmId` columns non-null where appropriate.
