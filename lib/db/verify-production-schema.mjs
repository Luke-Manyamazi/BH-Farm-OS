import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for production schema verification");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const meta = await pool.query(`
    select
      current_database() as database_name,
      current_schema() as schema_name,
      to_regclass('public.auth_users') as auth_users_table
  `);

  const columns = await pool.query(`
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'auth_users'
    order by ordinal_position
  `);

  const expected = [
    "id",
    "email",
    "display_name",
    "password_hash",
    "role_id",
    "active",
    "created_at",
    "updated_at",
  ];

  const actual = columns.rows.map((row) => row.column_name);
  const missing = expected.filter((column) => !actual.includes(column));

  console.log("[db-verify] database:", meta.rows[0]?.database_name);
  console.log("[db-verify] schema:", meta.rows[0]?.schema_name);
  console.log("[db-verify] auth_users:", meta.rows[0]?.auth_users_table ?? "MISSING");
  console.log("[db-verify] auth_users columns:", actual.join(", ") || "NONE");

  if (meta.rows[0]?.auth_users_table !== "auth_users") {
    throw new Error("Production database verification failed: public.auth_users does not exist after Drizzle schema sync");
  }

  if (missing.length > 0) {
    throw new Error(`Production database verification failed: auth_users is missing columns: ${missing.join(", ")}`);
  }

  await pool.query(`select id, email, display_name, password_hash, role_id, active, created_at, updated_at from public.auth_users limit 1`);
  console.log("[db-verify] auth_users login query: OK");
} finally {
  await pool.end();
}
