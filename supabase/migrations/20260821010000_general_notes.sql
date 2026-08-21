-- A third notes field, distinct from disclosure_notes ("We're Fixing") and
-- buyer_responsibility_notes ("Buyer's Responsibility") — general info about
-- the vehicle that isn't a fix or a buyer disclosure. Shown on Preview too.
alter table public.vehicles
  add column if not exists general_notes text;
