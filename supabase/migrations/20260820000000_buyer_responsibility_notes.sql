-- Splits vehicle notes into two designations: what Tri-State is handling
-- (existing disclosure_notes, relabeled "We're Fixing" in the UI) and what's
-- disclosed as the buyer's responsibility after sale. Kept as a separate
-- column rather than a tag/prefix scheme inside one field so staff never
-- have to remember a syntax — two plain boxes, two plain labels.
alter table public.vehicles
  add column if not exists buyer_responsibility_notes text;
