-- Supersedes the is_incoming boolean flag (never shipped/applied) with a
-- real pipeline status: managing incoming vs. arrived through the same
-- status dropdown as everything else, instead of a separate toggle.
-- Also adds pre_sold, for a vehicle with a committed buyer that hasn't
-- been finalized through "Mark as Sold" yet.
alter table public.vehicles
  drop constraint if exists valid_status;

alter table public.vehicles
  add constraint valid_status check (status in (
    'incoming', 'intake', 'arbitration', 'inspection', 'recon', 'ready',
    'pre_sold', 'in_auction', 'awarded', 'no_sale', 'sold'
  ));
