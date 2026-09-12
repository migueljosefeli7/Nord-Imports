-- Marcas colaboradoras: a marca principal continua definindo a taxonomia.
create table if not exists public.product_brands (
  product_id uuid not null references public.products(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, brand_id)
);

create index if not exists product_brands_brand_idx on public.product_brands(brand_id, product_id);
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
