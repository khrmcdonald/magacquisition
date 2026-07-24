-- Saved drop-off destinations for transport orders (store/auction name + address)
-- Kept separate from the `transport` table, which tracks auction-win pickup/delivery —
-- outside sales are a one-time event, not a multi-step tracked transport.
create table if not exists public.destinations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  name text not null,
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.destinations enable row level security;

create policy "destinations_select" on public.destinations
  for select using (true);

create policy "destinations_insert" on public.destinations
  for insert with check (true);

create policy "destinations_update" on public.destinations
  for update using (true);

-- Sale-destination detail for the printed transport order (separate from
-- the `transport` table, which is auction-pickup tracking only)
alter table public.vehicles
  add column if not exists sold_to_address text,
  add column if not exists transport_driver text;
