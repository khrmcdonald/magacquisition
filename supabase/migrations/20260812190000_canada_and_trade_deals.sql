-- International (Canada) purchases and trade/no-arrival deals.
-- origin_country/is_trade/bond fields live on vehicles since they describe
-- one purchase, same as purchase_price or title_status. purchase_price_cad +
-- exchange_rate are audit-only — purchase_price stays the canonical USD cost
-- basis, converted once at entry, not tracked live.
alter table public.vehicles
  add column if not exists origin_country text not null default 'US',
  add column if not exists purchase_price_cad numeric,
  add column if not exists exchange_rate numeric,
  add column if not exists bond_reference text,
  add column if not exists bond_expiration date,
  add column if not exists is_trade boolean not null default false;

-- Freeform document attachments (Bill of Sale, Ownership, customs forms, etc.)
-- Separate from `photos` (a bare URL array on vehicles) because each
-- attachment needs its own doc-type tag and filename, not just a URL.
create table if not exists public.vehicle_attachments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  doc_type text,
  file_url text not null,
  file_name text,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);

alter table public.vehicle_attachments enable row level security;

create policy "vehicle_attachments_select" on public.vehicle_attachments
  for select using (true);

create policy "vehicle_attachments_insert" on public.vehicle_attachments
  for insert with check (true);

create policy "vehicle_attachments_delete" on public.vehicle_attachments
  for delete using (true);

-- Storage bucket for attachment files, public read like vehicle-photos.
insert into storage.buckets (id, name, public)
values ('vehicle-attachments', 'vehicle-attachments', true)
on conflict (id) do nothing;

create policy "vehicle_attachments_storage_select" on storage.objects
  for select using (bucket_id = 'vehicle-attachments');

create policy "vehicle_attachments_storage_insert" on storage.objects
  for insert with check (bucket_id = 'vehicle-attachments');
