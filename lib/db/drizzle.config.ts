import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: "./src/schema/*.ts",
  dialect: "postgresql",
  // This application owns only the public application schema.
  // Supabase also contains platform schemas (auth, storage, etc.).
  // Restricting Drizzle to public prevents it from trying to reconcile
  // Supabase-managed schemas and entering an interactive conflict prompt.
  schemaFilter: ["public"],
  tablesFilter: ["*"],
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
