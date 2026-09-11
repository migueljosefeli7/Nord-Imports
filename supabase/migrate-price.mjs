import { readFile } from "node:fs/promises";
import process from "node:process";
import pg from "pg";

const connectionString = process.env.STORAGE_POSTGRES_URL;
if (!connectionString) { console.log("Price migration skipped outside production."); process.exit(0); }

const databaseUrl = new URL(connectionString);
databaseUrl.searchParams.delete("sslmode");
databaseUrl.searchParams.delete("uselibpqcompat");
const ca = await readFile(new URL("./prod-ca-2021.crt", import.meta.url), "utf8");
const client = new pg.Client({ connectionString: databaseUrl.toString(), ssl: { rejectUnauthorized: true, ca } });

try {
  await client.connect();
  await client.query("alter table public.products add column if not exists price numeric(12,2) check(price is null or price >= 0); alter table public.products add column if not exists show_price boolean not null default false;");
  console.log("Optional product pricing is ready.");
} catch (error) {
  console.error("Price migration failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
