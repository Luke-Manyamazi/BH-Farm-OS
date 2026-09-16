import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for production schema initialization");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Production startup must be deterministic and non-interactive. Drizzle Kit's
// push can ask rename questions when the live database contains an older
// schema. Render has no TTY, so those questions can abort startup even with
// --force. This initializer creates the application's public tables directly
// and is intentionally idempotent. Drizzle remains the source of truth for
// the TypeScript schema; this file is the production bootstrap safety net.
const statements = [
  `CREATE TABLE IF NOT EXISTS public.farms (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, status text NOT NULL DEFAULT 'active', profile jsonb NOT NULL DEFAULT '{}'::jsonb, settings jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS farms_name_unique ON public.farms (name)`,
  `CREATE INDEX IF NOT EXISTS farms_status_idx ON public.farms (status)`,
  `CREATE TABLE IF NOT EXISTS public.farm_zones (id serial PRIMARY KEY, farm_id uuid REFERENCES public.farms(id), name text NOT NULL, type text NOT NULL, dimensions text, status text NOT NULL DEFAULT 'Active', accent text NOT NULL DEFAULT 'sage')`,
  `CREATE INDEX IF NOT EXISTS farm_zones_farm_id_idx ON public.farm_zones (farm_id)`,
  `CREATE TABLE IF NOT EXISTS public.farm_tasks (id serial PRIMARY KEY, farm_id uuid REFERENCES public.farms(id), title text NOT NULL, description text, farm_unit text NOT NULL, priority text NOT NULL DEFAULT 'Normal', due_date date NOT NULL, due_time text, recurrence text, status text NOT NULL DEFAULT 'Pending', completed_at timestamptz, assigned_to text, notes text)`,
  `CREATE INDEX IF NOT EXISTS farm_tasks_farm_id_idx ON public.farm_tasks (farm_id)`,
  `CREATE TABLE IF NOT EXISTS public.goats (id serial PRIMARY KEY, farm_id uuid REFERENCES public.farms(id), goat_id text NOT NULL, name text NOT NULL, sex text NOT NULL, breed text NOT NULL, date_of_birth date, current_weight_kg numeric(8,2), paddock text NOT NULL DEFAULT 'Paddock 1', status text NOT NULL DEFAULT 'Active', pregnancy_status text NOT NULL DEFAULT 'Not pregnant', expected_kidding_date date, health_status text NOT NULL DEFAULT 'Good')`,
  `CREATE UNIQUE INDEX IF NOT EXISTS goats_farm_goat_id_unique ON public.goats (farm_id, goat_id)`,
  `CREATE INDEX IF NOT EXISTS goats_farm_id_idx ON public.goats (farm_id)`,
  `CREATE TABLE IF NOT EXISTS public.poultry_flocks (id serial PRIMARY KEY, farm_id uuid REFERENCES public.farms(id), batch_id text NOT NULL, kind text NOT NULL, breed text NOT NULL, current_quantity integer NOT NULL, starting_quantity integer NOT NULL, mortality integer NOT NULL DEFAULT 0, average_weight_kg numeric(8,2), feed_kg numeric(10,2) NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'Active', expected_sale_date date)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS poultry_flocks_farm_batch_id_unique ON public.poultry_flocks (farm_id, batch_id)`,
  `CREATE INDEX IF NOT EXISTS poultry_flocks_farm_id_idx ON public.poultry_flocks (farm_id)`,
  `CREATE TABLE IF NOT EXISTS public.inventory_items (id serial PRIMARY KEY, farm_id uuid REFERENCES public.farms(id), item_id text NOT NULL, name text NOT NULL, category text NOT NULL, unit text NOT NULL, quantity numeric(10,2) NOT NULL DEFAULT 0, minimum_stock numeric(10,2) NOT NULL DEFAULT 0, maximum_stock numeric(10,2) NOT NULL DEFAULT 0, supplier text, purchase_price numeric(10,2), last_purchase_date date, storage_location text)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_farm_item_id_unique ON public.inventory_items (farm_id, item_id)`,
  `CREATE INDEX IF NOT EXISTS inventory_items_farm_id_idx ON public.inventory_items (farm_id)`,
  `CREATE TABLE IF NOT EXISTS public.inventory_transactions (id serial PRIMARY KEY, farm_id uuid REFERENCES public.farms(id), inventory_item_id integer NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE, type text NOT NULL, quantity numeric(10,2) NOT NULL, note text, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS inventory_transactions_farm_id_idx ON public.inventory_transactions (farm_id)`,
  `CREATE INDEX IF NOT EXISTS inventory_transactions_item_id_idx ON public.inventory_transactions (inventory_item_id)`,
  `CREATE TABLE IF NOT EXISTS public.finance_transactions (id serial PRIMARY KEY, farm_id uuid REFERENCES public.farms(id), type text NOT NULL, category text NOT NULL, farm_unit text NOT NULL, description text NOT NULL, amount numeric(12,2) NOT NULL, transaction_date date NOT NULL, counterparty text)`,
  `CREATE INDEX IF NOT EXISTS finance_transactions_farm_id_idx ON public.finance_transactions (farm_id)`,
  `CREATE TABLE IF NOT EXISTS public.farm_records (id serial PRIMARY KEY, farm_id uuid REFERENCES public.farms(id), record_type text NOT NULL, name text NOT NULL, status text NOT NULL DEFAULT 'Active', farm_unit text NOT NULL DEFAULT 'General', record_date date, data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS farm_records_farm_id_idx ON public.farm_records (farm_id)`,
  `CREATE TABLE IF NOT EXISTS public.auth_roles (id serial PRIMARY KEY, key text NOT NULL, name text NOT NULL, description text, is_system boolean NOT NULL DEFAULT true)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS auth_roles_key_unique ON public.auth_roles (key)`,
  `CREATE TABLE IF NOT EXISTS public.auth_permissions (id serial PRIMARY KEY, key text NOT NULL, description text)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS auth_permissions_key_unique ON public.auth_permissions (key)`,
  `CREATE TABLE IF NOT EXISTS public.auth_role_permissions (role_id integer NOT NULL REFERENCES public.auth_roles(id) ON DELETE CASCADE, permission_id integer NOT NULL REFERENCES public.auth_permissions(id) ON DELETE CASCADE, PRIMARY KEY (role_id, permission_id))`,
  `CREATE TABLE IF NOT EXISTS public.auth_users (id serial PRIMARY KEY, email text NOT NULL, display_name text NOT NULL, password_hash text NOT NULL, role_id integer NOT NULL REFERENCES public.auth_roles(id), active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS auth_users_email_unique ON public.auth_users (email)`,
  `CREATE TABLE IF NOT EXISTS public.auth_user_farms (user_id integer NOT NULL REFERENCES public.auth_users(id) ON DELETE CASCADE, farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE, role_id integer NOT NULL REFERENCES public.auth_roles(id), active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, farm_id))`,
  `CREATE TABLE IF NOT EXISTS public.auth_sections (id serial PRIMARY KEY, key text NOT NULL, name text NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS auth_sections_key_unique ON public.auth_sections (key)`,
  `CREATE TABLE IF NOT EXISTS public.auth_user_sections (user_id integer NOT NULL REFERENCES public.auth_users(id) ON DELETE CASCADE, farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE, section_id integer NOT NULL REFERENCES public.auth_sections(id) ON DELETE CASCADE, PRIMARY KEY (user_id, farm_id, section_id))`,
  `CREATE TABLE IF NOT EXISTS public.auth_sessions (id serial PRIMARY KEY, user_id integer NOT NULL REFERENCES public.auth_users(id) ON DELETE CASCADE, active_farm_id uuid REFERENCES public.farms(id) ON DELETE SET NULL, token_hash text NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS auth_sessions_token_hash_unique ON public.auth_sessions (token_hash)`,
  `CREATE TABLE IF NOT EXISTS public.auth_audit_logs (id serial PRIMARY KEY, user_id integer REFERENCES public.auth_users(id) ON DELETE SET NULL, farm_id uuid REFERENCES public.farms(id) ON DELETE SET NULL, action text NOT NULL, entity_type text, entity_id text, details text, created_at timestamptz NOT NULL DEFAULT now())`,
];

try {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
    for (const sql of statements) await client.query(sql);
    await client.query("COMMIT");
    console.log(`[db-init] ensured ${statements.length} public application schema objects`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
