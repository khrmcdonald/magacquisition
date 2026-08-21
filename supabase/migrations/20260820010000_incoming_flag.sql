-- Lets staff mark a vehicle as publicly visible on /preview before it has
-- physically arrived (e.g. purchased out of state, still in transit).
-- Kept as a flag independent of the status pipeline (intake/inspection/
-- recon/ready) rather than a new pipeline stage, since an incoming vehicle
-- still goes through the normal intake->ready flow once it arrives — this
-- only controls whether it's advertised early, not where it sits internally.
alter table public.vehicles
  add column if not exists is_incoming boolean not null default false;
