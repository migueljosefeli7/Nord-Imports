import { readFile } from "node:fs/promises";
import process from "node:process";
import pg from "pg";

const connectionString = process.env.STORAGE_POSTGRES_URL_NON_POOLING || process.env.STORAGE_POSTGRES_URL;

if (!connectionString) {
  console.log("Supabase migration skipped: no production database connection.");
  process.exit(0);
}

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  const { rows } = await client.query("select to_regclass('public.brands') as table_name");
  if (rows[0]?.table_name) {
    console.log("Supabase schema already exists; migration skipped.");
  } else {
    const schema = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
    await client.query(schema);
    console.log("Supabase schema created successfully.");
  }
} catch (error) {
  console.error("Supabase schema migration failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
