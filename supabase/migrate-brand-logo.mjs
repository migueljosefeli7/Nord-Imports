import pg from "pg";

const connectionString = process.env.STORAGE_POSTGRES_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.log("Brand logo migration skipped: database URL unavailable.");
  process.exit(0);
}

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query("alter table public.brands add column if not exists logo_url text");
await client.end();
console.log("Brand logo migration ready.");
