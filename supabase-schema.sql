-- ─── Orders table (UPI payment gateway) ───────────────────────────────────────
create table if not exists public.orders (
  id text primary key,
  customer_name text not null default 'Customer',
  items jsonb not null default '[]',
  total numeric not null default 0,
  upi_app text not null default 'upi',
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

alter table public.orders enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'No public direct access'
  ) then
    create policy "No public direct access"
    on public.orders
    for all
    using (false)
    with check (false);
  end if;
end;
$$;

-- ─── Store documents ───────────────────────────────────────────────────────────
create table if not exists public.store_documents (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.touch_store_documents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'touch_store_documents_updated_at'
  ) then
    create trigger touch_store_documents_updated_at
    before update on public.store_documents
    for each row
    execute function public.touch_store_documents_updated_at();
  end if;
end;
$$;

alter table public.store_documents enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'store_documents'
      and policyname = 'No public direct access'
  ) then
    create policy "No public direct access"
    on public.store_documents
    for all
    using (false)
    with check (false);
  end if;
end;
$$;
