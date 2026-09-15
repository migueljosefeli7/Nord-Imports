import crypto from "node:crypto";
import { Client } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_HASH = "7196b869ca213ca80dd7be676c7573b860f53a3e357ed869e68478a0fa2b1347";

function authorized(request) {
  const supplied = request.headers.get("x-migration-token") || "";
  const received = crypto.createHash("sha256").update(supplied).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(TOKEN_HASH));
}

export async function POST(request) {
  if (!authorized(request)) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const connectionString =
    process.env.STORAGE_POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.STORAGE_POSTGRES_URL ||
    process.env.POSTGRES_URL;

  if (!connectionString) {
    return Response.json({ error: "Conexão PostgreSQL indisponível." }, { status: 500 });
  }

  const databaseUrl = new URL(connectionString);
  databaseUrl.searchParams.delete("sslmode");
  databaseUrl.searchParams.delete("sslrootcert");
  databaseUrl.searchParams.delete("sslcert");
  databaseUrl.searchParams.delete("sslkey");
  const client = new Client({
    connectionString: databaseUrl.toString(),
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query("begin");
    await client.query(`
      create table if not exists public.product_brands (
        product_id uuid not null references public.products(id) on delete cascade,
        brand_id uuid not null references public.brands(id) on delete cascade,
        created_at timestamptz not null default now(),
        primary key (product_id, brand_id)
      );

      create index if not exists product_brands_brand_idx
        on public.product_brands(brand_id, product_id);

      alter table public.product_brands enable row level security;

      drop policy if exists "public product brands" on public.product_brands;
      create policy "public product brands" on public.product_brands
        for select using (
          exists (
            select 1 from public.products p
            where p.id = product_id and (p.active or public.has_role('admin'))
          )
        );

      drop policy if exists "admin product brands" on public.product_brands;
      create policy "admin product brands" on public.product_brands
        for all using (public.has_role('admin')) with check (public.has_role('admin'));
    `);
    await client.query("notify pgrst, 'reload schema'");
    await client.query("commit");

    const result = await client.query(`
      select
        to_regclass('public.product_brands')::text as table_name,
        (select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'product_brands') as policy_count
    `);

    return Response.json({
      ok: result.rows[0]?.table_name === "product_brands" && result.rows[0]?.policy_count >= 2,
      table: result.rows[0]?.table_name,
      policies: result.rows[0]?.policy_count,
    });
  } catch (error) {
    await client.query("rollback");
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha ao aplicar a migração." },
      { status: 500 },
    );
  } finally {
    await client.end();
  }
}
