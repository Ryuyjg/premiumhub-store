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
