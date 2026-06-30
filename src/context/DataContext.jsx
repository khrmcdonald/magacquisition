import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import LoadingScreen from '../components/LoadingScreen';

const DataContext = createContext(null);
const ORG_ID = 'bf236d2b-4693-4606-bf3d-ece1767690ab';

// Fields verified against actual vehicles table schema — never send to Supabase.
const STRIP_FIELDS = new Set([
  // Auto-managed by DB
  'createdAt', 'created_at', 'updatedAt', 'updated_at', 'listedAt', 'listed_at',
  // Computed — never write directly
  'totalCost', 'total_cost_basis', 'totalCostBasis',
  // vin6 is auto-derived from vin
  'vin6',
  // Columns that don't exist in vehicles table
  'reconCosts', 'recon_costs',
  'reconItems', 'recon_items', 'reconNotes', 'recon_notes',
  'vendorNotes', 'vendor_notes',
  'mileage',                // no column in vehicles table — lives in mileage_log
  'source',                 // lives in deal_records table
  'storeId', 'store_id',
  // Repair total updated by repair order mutations, not the vehicle edit form
  'totalRepairCosts', 'total_repair_costs',
  // Derived camel aliases — strip to avoid duplicate writes
  'arbitrationStatus', 'arbitration_status', 'arbitrationNotes', 'arbitration_notes',
]);

// ── Column mappers: Supabase snake_case → app camelCase ───────────────────
function mapVehicle(r) {
  return {
    id: r.id,
    status: r.status,
    year: r.year, make: r.make, model: r.model, trim: r.trim,
    color: r.color, interior_color: r.interior_color || null,
    mileage: r.mileage, vin: r.vin,
    condition: r.condition,
    purchasePrice: r.purchase_price,
    overheadCosts: r.overhead_costs,
    totalRepairCosts: parseFloat(r.total_repair_costs) || 0,
    totalCost: (parseFloat(r.purchase_price) || 0) + (parseFloat(r.overhead_costs) || 0) + (parseFloat(r.total_repair_costs) || 0) || null,
    floorPrice: r.floor_price,
    openingBid: r.opening_bid ? parseFloat(r.opening_bid) : null,
    listPrice: r.list_price,
    notes: r.disclosure_notes,
    photos: Array.isArray(r.photos) ? r.photos : [],
    currentLocation: r.current_location_id,
    titleStatus: r.title_status || 'pending',
    titleNotes: r.title_notes || null,
    titleElectronic: r.title_electronic,
    title_tracker: r.title_tracker || null,
    inspection: r.inspection || null,
    canListBeforeTitle: r.can_list_before_title,
    winnerId: r.winner_id,
    winnerName: r.winner_name,
    winningBid: r.winning_bid,
    awardedAt: r.awarded_at,
    listedAt: r.listed_at,
    createdAt: r.created_at,
    arbitration: r.arbitration,
    buyer_id: r.buyer_id || null,
    buyer_name: r.buyer_name || null,
    datePurchased: r.date_purchased || null,
    sourceId: r.source_id || null,
  };
}

function mapBid(r) {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    storeId: r.user_id,
    locationId: r.location_id,
    amount: r.amount,
    auctionId: r.auction_id,
    placedAt: r.placed_at,
    updatedAt: r.updated_at,
  };
}

function mapAuction(r) {
  return {
    id: r.id,
    isOpen: r.status === 'open',
    openDate: r.open_at,
    closeDate: r.close_at,
    label: r.label,
    closedDate: r.closed_at,
  };
}

function mapTransport(r) {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    vehicleName: r.vehicle_name,
    storeId: r.store_id,
    locationId: r.location_id,
    storeName: r.store_name,
    winningBid: r.winning_bid,
    status: r.status,
    notes: r.notes,
    steps: r.steps || {},
    scheduledDate: r.scheduled_date || null,
    createdAt: r.created_at,
  };
}

function mapRepairOrderLine(r) {
  return {
    id: r.id,
    repairOrderId: r.repair_order_id,
    description: r.description,
    cost: parseFloat(r.cost) || 0,
    status: r.status || 'pending',
    notes: r.notes,
    createdAt: r.created_at,
  };
}

function mapRepairOrder(r) {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    vin6: r.vin6,
    vendorId: r.vendor_id,
    status: r.status,
    notes: r.notes,
    totalCost: parseFloat(r.total_cost) || 0,
    createdAt: r.created_at,
    lines: (r.repair_order_lines || []).map(mapRepairOrderLine),
  };
}

function mapRepairVendor(r) {
  return { id: r.id, name: r.name, phone: r.phone, type: r.type };
}

// Map camelCase vehicle fields back to snake_case for Supabase writes
// Only real, writable vehicles table columns. Verified against schema.
const VEHICLE_FIELD_MAP = {
  status: 'status', year: 'year', make: 'make', model: 'model', trim: 'trim',
  color: 'color', vin: 'vin', condition: 'condition',
  purchasePrice: 'purchase_price', overheadCosts: 'overhead_costs',
  floorPrice: 'floor_price', openingBid: 'opening_bid', listPrice: 'list_price',
  datePurchased: 'date_purchased',
  sourceId: 'source_id',
  source_id: 'source_id',
  notes: 'disclosure_notes',     // app uses 'notes', DB column is 'disclosure_notes'
  photos: 'photos',
  currentLocation: 'current_location_id',
  titleStatus: 'title_status', titleElectronic: 'title_electronic',
  titleNotes: 'title_notes',
  inspection: 'inspection',
  canListBeforeTitle: 'can_list_before_title',
  winnerId: 'winner_id', winnerName: 'winner_name', winningBid: 'winning_bid',
  awardedAt: 'awarded_at',
  interior_color: 'interior_color',
  buyer_id: 'buyer_id',
  buyer_name: 'buyer_name',
  arbitration: 'arbitration',
};

function toSnakeCase(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    out[VEHICLE_FIELD_MAP[k] || k] = v;
  }
  return out;
}

// ── Provider ──────────────────────────────────────────────────────────────
export function DataProvider({ children }) {
  const [vehicles, setVehicles] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [bids, setBids] = useState([]);
  const [locations, setLocations] = useState([]);
  const [acquisitionSources, setAcquisitionSources] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [transport, setTransport] = useState([]);
  const [repairOrders, setRepairOrders] = useState([]);
  const [repairVendors, setRepairVendors] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [pickupAddresses, setPickupAddresses] = useState([]);
  const [badges, setBadges] = useState({});
  const [storePhotos, setStorePhotos] = useState({});
  const [orgSettings, setOrgSettings] = useState({});
  const [fetchError, setFetchError] = useState(null);

  // ── Initial data fetch ───────────────────────────────────────────────────
  useEffect(() => {
    async function fetchAll() {
      const [vehiclesRes, auctionsRes, bidsRes, locationsRes, sourcesRes, transportRes, repairOrdersRes, repairVendorsRes, buyersRes, inspectorsRes, pickupAddressesRes, mileageRes, orgSettingsRes] = await Promise.all([
        supabase.from('vehicles').select('*').eq('org_id', ORG_ID),
        supabase.from('auctions').select('*').eq('org_id', ORG_ID),
        supabase.from('bids').select('*'),
        supabase.from('locations').select('*').eq('org_id', ORG_ID),
        supabase.from('acquisition_sources').select('*').eq('org_id', ORG_ID),
        supabase.from('transport').select('*').eq('org_id', ORG_ID),
        supabase.from('repair_orders').select('*, repair_order_lines(*)').eq('org_id', ORG_ID),
        supabase.from('repair_vendors').select('*').eq('org_id', ORG_ID).eq('active', true),
        supabase.from('profiles').select('id, name, buyer_number, role').eq('org_id', ORG_ID),
        supabase.from('inspectors').select('*').eq('org_id', ORG_ID).eq('active', true).order('name'),
        supabase.from('pickup_addresses').select('*').eq('org_id', ORG_ID).eq('active', true).order('address'),
        supabase.from('mileage_log').select('vehicle_id, reading, logged_at').eq('org_id', ORG_ID).order('logged_at', { ascending: false }),
        supabase.from('org_settings').select('data').eq('org_id', ORG_ID).maybeSingle(),
      ]);
      if (vehiclesRes.error) {
        setFetchError('Could not load vehicle data. Check your connection and refresh the page.');
        setLoading(false);
        return;
      }
      if (auctionsRes.error)      console.warn('auctions fetch error:',      auctionsRes.error?.message);
      if (bidsRes.error)          console.warn('bids fetch error:',          bidsRes.error?.message);
      if (locationsRes.error)     console.warn('locations fetch error:',     locationsRes.error?.message);
      if (sourcesRes.error)       console.warn('sources fetch error:',       sourcesRes.error?.message);
      if (transportRes.error)     console.warn('transport fetch error:',     transportRes.error?.message);
      if (repairOrdersRes.error)  console.warn('repair_orders fetch error:', repairOrdersRes.error?.message);
      if (repairVendorsRes.error)    console.warn('repair_vendors fetch error:',    repairVendorsRes.error?.message);
      if (inspectorsRes.error)       console.warn('inspectors fetch error:',       inspectorsRes.error?.message);
      if (pickupAddressesRes.error)  console.warn('pickup_addresses fetch error:', pickupAddressesRes.error?.message);

      if (vehiclesRes.data) {
        const mileageMap = {};
        mileageRes.data?.forEach(r => { if (!mileageMap[r.vehicle_id]) mileageMap[r.vehicle_id] = r.reading; });
        setVehicles(vehiclesRes.data.map(r => ({ ...mapVehicle(r), mileage: mileageMap[r.id] ?? null })));
      }
      if (buyersRes.data) {
        setBuyers(buyersRes.data.filter(p => p.role === 'wholesale'));
        setProfiles(buyersRes.data);
      }
      if (auctionsRes.data)      setAuctions(auctionsRes.data.map(mapAuction));
      if (bidsRes.data)          setBids(bidsRes.data.map(mapBid));
      if (locationsRes.data)     setLocations(locationsRes.data);
      if (sourcesRes.data)       setAcquisitionSources(sourcesRes.data);
      if (transportRes.data)     setTransport(transportRes.data.map(mapTransport));
      if (repairOrdersRes.data)  setRepairOrders(repairOrdersRes.data.map(mapRepairOrder));
      if (repairVendorsRes.data) setRepairVendors(repairVendorsRes.data.map(mapRepairVendor));
      if (inspectorsRes.data)      setInspectors(inspectorsRes.data);
      if (pickupAddressesRes.data) setPickupAddresses(pickupAddressesRes.data);
      if (orgSettingsRes.data?.data) setOrgSettings(orgSettingsRes.data.data);
      setLoading(false);
    }
    fetchAll();
  }, []);

  // ── Realtime subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    const vehiclesSub = supabase
      .channel('vehicles-changes')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'vehicles',
        filter: `org_id=eq.${ORG_ID}`,
      }, ({ eventType, new: row, old }) => {
        setVehicles(prev => {
          if (eventType === 'INSERT') return [...prev, mapVehicle(row)];
          if (eventType === 'UPDATE') return prev.map(v => {
            if (v.id !== row.id) return v;
            // Preserve mileage — it lives in mileage_log, not vehicles table
            return { ...mapVehicle(row), mileage: v.mileage ?? null };
          });
          if (eventType === 'DELETE') return prev.filter(v => v.id !== old.id);
          return prev;
        });
      })
      .subscribe();

    const auctionsSub = supabase
      .channel('auctions-changes')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'auctions',
        filter: `org_id=eq.${ORG_ID}`,
      }, ({ eventType, new: row, old }) => {
        setAuctions(prev => {
          if (eventType === 'INSERT') return [...prev, mapAuction(row)];
          if (eventType === 'UPDATE') return prev.map(a => a.id === row.id ? mapAuction(row) : a);
          if (eventType === 'DELETE') return prev.filter(a => a.id !== old.id);
          return prev;
        });
      })
      .subscribe();

    const bidsSub = supabase
      .channel('bids-changes')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'bids',
      }, ({ eventType, new: row, old }) => {
        setBids(prev => {
          if (eventType === 'INSERT') return [...prev, mapBid(row)];
          if (eventType === 'UPDATE') return prev.map(b => b.id === row.id ? mapBid(row) : b);
          if (eventType === 'DELETE') return prev.filter(b => b.id !== old.id);
          return prev;
        });
      })
      .subscribe();

    const transportSub = supabase
      .channel('transport-changes')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'transport',
        filter: `org_id=eq.${ORG_ID}`,
      }, ({ eventType, new: row, old }) => {
        setTransport(prev => {
          if (eventType === 'INSERT') return [...prev, mapTransport(row)];
          if (eventType === 'UPDATE') return prev.map(t => t.id === row.id ? mapTransport(row) : t);
          if (eventType === 'DELETE') return prev.filter(t => t.id !== old.id);
          return prev;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(vehiclesSub);
      supabase.removeChannel(auctionsSub);
      supabase.removeChannel(bidsSub);
      supabase.removeChannel(transportSub);
    };
  }, []);

  // ── Derived backward-compatible `data` object ────────────────────────────
  const currentAuction = auctions.find(a => a.isOpen) || null;

  const data = {
    auction: currentAuction
      ? { isOpen: true, id: currentAuction.id, openDate: currentAuction.openDate, closeDate: currentAuction.closeDate, label: currentAuction.label }
      : { isOpen: false, openDate: null, closeDate: null, label: '' },
    vehicles,
    bids,
    transport,
    repairOrders,
    repairVendors,
    auctionHistory: auctions
      .filter(a => !a.isOpen)
      .map(a => ({
        id: a.id, label: a.label,
        openDate: a.openDate, closedDate: a.closedDate,
        vehicleCount: a.vehicleCount, awardedCount: a.awardedCount,
        noSaleCount: a.noSaleCount, totalVolume: a.totalVolume,
      })),
    badges,
    storePhotos,
    auctions,
    locations,
    acquisition_sources: acquisitionSources,
    buyers,
    profiles,
    inspectors,
    pickupAddresses,
    orgSettings,
  };

  // ── Auction mutations ─────────────────────────────────────────────────────
  const addAuction = async (auction) => {
    const { data: row, error } = await supabase
      .from('auctions')
      .insert({ org_id: ORG_ID, ...auction })
      .select()
      .single();
    if (error) throw error;
    return row;
  };

  const updateAuction = async (id, updates) => {
    const { error } = await supabase.from('auctions').update(updates).eq('id', id);
    if (error) throw error;
  };

  const setAuction = async (fields) => {
    if (!currentAuction) return;
    const mapped = {};
    if ('isOpen' in fields) mapped.status = fields.isOpen ? 'open' : 'closed';
    if ('closeDate' in fields) mapped.close_at = fields.closeDate;
    if ('label' in fields) mapped.label = fields.label;
    await updateAuction(currentAuction.id, mapped);
  };

  const openAuction = async (closeDate, label) => {
    const row = await addAuction({
      status: 'open',
      open_at: new Date().toISOString(),
      close_at: closeDate,
      label: label || '',
    });
    if (row) setAuctions(prev => [...prev, mapAuction(row)]);
  };

  const closeAuction = async () => {
    if (!currentAuction) return;
    const now = new Date().toISOString();
    const activeVehicles = vehicles.filter(v => v.status === 'in_auction');

    let awardedCount = 0;
    let noSaleCount = 0;
    let totalVolume = 0;
    const newTransport = [];
    const vehicleUpdates = [];

    for (const v of activeVehicles) {
      const vehicleBids = bids.filter(b => b.vehicleId === v.id);
      if (vehicleBids.length === 0) {
        noSaleCount++;
        vehicleUpdates.push(
          supabase.from('vehicles').update({ status: 'no_sale' }).eq('id', v.id)
        );
      } else {
        const winner = [...vehicleBids].sort((a, b) => b.amount - a.amount)[0];
        if (v.floorPrice && winner.amount < parseFloat(v.floorPrice)) {
          noSaleCount++;
          vehicleUpdates.push(
            supabase.from('vehicles').update({ status: 'no_sale' }).eq('id', v.id)
          );
        } else {
          const winnerLoc = locations.find(l => l.id === winner.locationId);
          const winnerLocName = winnerLoc?.name || '—';
          awardedCount++;
          totalVolume += winner.amount;
          vehicleUpdates.push(
            supabase.from('vehicles').update({
              status: 'awarded',
              winner_id: winner.storeId,
              winner_name: winnerLocName,
              winning_bid: winner.amount,
              awarded_at: now,
            }).eq('id', v.id)
          );
          if (!transport.find(t => t.vehicleId === v.id && t.storeName !== 'Intake')) {
            newTransport.push({
              vehicleId: v.id,
              vehicleName: `${v.year} ${v.make} ${v.model}`,
              storeId: winner.storeId,
              locationId: winner.locationId,
              storeName: winnerLocName,
              winningBid: winner.amount,
              status: 'awarded',
              steps: { awarded: now, dispatched: null, inTransit: null, arrived: null, titleReceived: null },
            });
          }
        }
      }
    }

    await Promise.all(vehicleUpdates);
    await updateAuction(currentAuction.id, { status: 'closed', closed_at: now });
    setAuctions(prev => prev.map(a => a.id === currentAuction.id ? { ...a, isOpen: false, closedDate: now } : a));

    // Update vehicle statuses in local state
    setVehicles(prev => prev.map(v => {
      if (v.status !== 'in_auction') return v;
      const vehicleBids = bids.filter(b => b.vehicleId === v.id);
      if (!vehicleBids.length) return { ...v, status: 'no_sale' };
      const winner = [...vehicleBids].sort((a, b) => b.amount - a.amount)[0];
      if (v.floorPrice && winner.amount < parseFloat(v.floorPrice)) return { ...v, status: 'no_sale' };
      const winnerLoc = locations.find(l => l.id === winner.locationId);
      return { ...v, status: 'awarded', winnerId: winner.storeId, winnerName: winnerLoc?.name || '—', winningBid: winner.amount, awardedAt: now };
    }));

    if (newTransport.length) {
      const { data: insertedTransport, error: transportErr } = await supabase
        .from('transport')
        .insert(newTransport.map(t => ({
          id: crypto.randomUUID(),
          org_id: ORG_ID,
          vehicle_id: t.vehicleId,
          vehicle_name: t.vehicleName,
          store_id: t.storeId,
          location_id: t.locationId,
          store_name: t.storeName,
          winning_bid: t.winningBid,
          status: t.status,
          steps: t.steps,
        })))
        .select();
      if (transportErr) console.error('Transport insert error:', transportErr);
      if (insertedTransport) setTransport(prev => [...prev, ...insertedTransport.map(mapTransport)]);
    }
  };

  // ── Vehicle mutations ─────────────────────────────────────────────────────
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const asUuid = (v) => (v && UUID_RE.test(v) ? v : null);
  const stripPayload = (obj) => Object.fromEntries(Object.entries(obj).filter(([k]) => !STRIP_FIELDS.has(k)));

  const addVehicle = async (vehicle) => {
    const payload = stripPayload({
      org_id:              ORG_ID,
      status:              vehicle.status || 'intake',
      intake_at:           new Date().toISOString(),
      vin:                 vehicle.vin              || null,
      year:                vehicle.year             || null,
      make:                vehicle.make             || null,
      model:               vehicle.model            || null,
      trim:                vehicle.trim             || null,
      color:               vehicle.color            || null,
      interior_color:      vehicle.interior_color   || null,
      condition:           vehicle.condition        || null,
      current_location_id: vehicle.currentLocation  || null,
      purchase_price:      vehicle.purchasePrice    ? parseFloat(vehicle.purchasePrice)  : null,
      overhead_costs:      vehicle.overheadCosts    ? parseFloat(vehicle.overheadCosts)  : null,
      floor_price:         vehicle.floorPrice       ? parseFloat(vehicle.floorPrice)     : null,
      list_price:          vehicle.listPrice        ? parseFloat(vehicle.listPrice)      : null,
      title_status:        vehicle.titleStatus      || null,
      buyer_id:            vehicle.buyer_id         || null,
      buyer_name:          vehicle.buyer_name       || null,
      disclosure_notes:    vehicle.notes            || null,
      photos:              Array.isArray(vehicle.photos) ? vehicle.photos : [],
    });

    const { data: row, error } = await supabase
      .from('vehicles')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    setVehicles(prev => [...prev, mapVehicle(row)]);
    return row;
  };

  const updateVehicle = async (id, fields) => {
    const clean = stripPayload(toSnakeCase(
      Object.fromEntries(Object.entries(fields).filter(([k]) => !STRIP_FIELDS.has(k)))
    ));
    const snapshot = vehicles.find(v => v.id === id);
    setVehicles(prev => prev.map(v => v.id === id ? { ...v, ...fields } : v));
    const { error } = await supabase.from('vehicles').update(clean).eq('id', id);
    if (error) {
      if (snapshot) setVehicles(prev => prev.map(v => v.id === id ? snapshot : v));
      throw error;
    }
  };

  const deleteVehicle = async (id) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) throw error;
    setVehicles(prev => prev.filter(v => v.id !== id));
  };

  const listVehicle = async (id, openingBid) => {
    await updateVehicle(id, { status: 'in_auction', openingBid: parseFloat(openingBid) || null });
  };

  const unlistVehicle = async (id) => {
    await updateVehicle(id, { status: 'ready' });
    const { error } = await supabase.from('bids').delete().eq('vehicle_id', id);
    if (error) throw error;
    setBids(prev => prev.filter(b => b.vehicleId !== id));
  };

  const getMileage = async (vehicleId) => {
    const { data } = await supabase
      .from('mileage_log')
      .select('reading')
      .eq('vehicle_id', vehicleId)
      .order('logged_at', { ascending: false })
      .limit(1)
      .single();
    return data?.reading ?? null;
  };

  const logMileage = async (vehicleId, reading, vin6 = null, reason = 'edit') => {
    const val = parseInt(reading);
    if (!val) return;
    const { error } = await supabase.from('mileage_log').insert({
      vehicle_id: vehicleId,
      org_id: ORG_ID,
      reading: val,
      vin6: vin6 || null,
      reason,
    });
    if (error) throw error;
    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, mileage: val } : v));
  };

  // ── Bid mutations ─────────────────────────────────────────────────────────
  const addBid = async (bid) => {
    const { data: row, error } = await supabase
      .from('bids')
      .insert({
        vehicle_id: bid.vehicleId,
        user_id: bid.userId,
        location_id: bid.locationId,
        amount: bid.amount,
        auction_id: bid.auctionId,
        placed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    setBids(prev => [...prev, mapBid(row)]);
  };

  // Backward-compat wrapper used by existing components
  const placeBid = async (vehicleId, userId, locationId, amount) => {
    await addBid({ vehicleId, userId, locationId, amount, auctionId: currentAuction?.id });
    checkAndAwardBadges(locationId);
  };

  // ── Bid helpers ───────────────────────────────────────────────────────────
  const getHighBid = (vehicleId) => {
    const vBids = bids.filter(b => b.vehicleId === vehicleId);
    if (!vBids.length) return null;
    return Math.max(...vBids.map(b => b.amount));
  };

  const getMyBid = (vehicleId, storeId) => {
    const mine = bids.filter(b => b.vehicleId === vehicleId && b.storeId === storeId);
    if (!mine.length) return null;
    return mine.reduce((top, b) => b.amount > top.amount ? b : top);
  };

  const getAllBidsForVehicle = (vehicleId) =>
    [...bids.filter(b => b.vehicleId === vehicleId)].sort((a, b) => b.amount - a.amount);

  // ── Transport ─────────────────────────────────────────────────────────────
  const updateTransport = async (vehicleId, stepKey, notes) => {
    const t = transport.find(tr => tr.vehicleId === vehicleId);
    if (!t) return;
    const updatedSteps = { ...t.steps, [stepKey]: new Date().toISOString() };
    const updatedNotes = notes || t.notes;
    setTransport(prev => prev.map(tr =>
      tr.vehicleId === vehicleId
        ? { ...tr, status: stepKey, notes: updatedNotes, steps: updatedSteps }
        : tr
    ));
    const { error } = await supabase.from('transport')
      .update({ status: stepKey, notes: updatedNotes, steps: updatedSteps })
      .eq('id', t.id);
    if (error) console.error('updateTransport error:', error);
  };

  const deleteTransport = async (id) => {
    const { error } = await supabase.from('transport').delete().eq('id', id);
    if (error) throw error;
    setTransport(prev => prev.filter(t => t.id !== id));
  };

  // ── Repair orders ─────────────────────────────────────────────────────────
  const addRepairVendor = async (name, phone) => {
    const { data: row, error } = await supabase
      .from('repair_vendors')
      .insert({ org_id: ORG_ID, name, phone: phone || null, active: true })
      .select()
      .single();
    if (error) throw error;
    const mapped = mapRepairVendor(row);
    setRepairVendors(prev => [...prev, mapped]);
    return mapped;
  };

  const syncVehicleRepairCosts = async (vehicleId, updatedROs) => {
    const total = updatedROs.filter(r => r.vehicleId === vehicleId).reduce((s, r) => s + r.totalCost, 0);
    await supabase.from('vehicles').update({ total_repair_costs: total }).eq('id', vehicleId);
    setVehicles(prev => prev.map(v => {
      if (v.id !== vehicleId) return v;
      return { ...v, totalRepairCosts: total, totalCost: (parseFloat(v.purchasePrice) || 0) + (parseFloat(v.overheadCosts) || 0) + total };
    }));
  };

  const addRepairOrder = async (vehicleId, vin6, vendorId, notes, cost = 0) => {
    const { data: row, error } = await supabase
      .from('repair_orders')
      .insert({ org_id: ORG_ID, vehicle_id: vehicleId, vin6: vin6 || null, vendor_id: vendorId || null, status: 'draft', notes: notes || null, total_cost: parseFloat(cost) || 0 })
      .select('*, repair_order_lines(*)')
      .single();
    if (error) throw error;
    const mapped = mapRepairOrder(row);
    const updatedROs = [...repairOrders, mapped];
    setRepairOrders(updatedROs);
    await syncVehicleRepairCosts(vehicleId, updatedROs);
    return mapped;
  };

  const updateRepairOrder = async (id, fields) => {
    const { error } = await supabase.from('repair_orders').update(fields).eq('id', id);
    if (error) throw error;
    const ro = repairOrders.find(r => r.id === id);
    const updatedROs = repairOrders.map(r => {
      if (r.id !== id) return r;
      return {
        ...r,
        status:    fields.status    ?? r.status,
        notes:     fields.notes     ?? r.notes,
        totalCost: fields.total_cost != null ? parseFloat(fields.total_cost) : r.totalCost,
        vendorId:  fields.vendor_id  !== undefined ? fields.vendor_id : r.vendorId,
      };
    });
    setRepairOrders(updatedROs);
    if (fields.total_cost != null && ro) await syncVehicleRepairCosts(ro.vehicleId, updatedROs);
  };

  const deleteRepairOrder = async (id) => {
    const ro = repairOrders.find(r => r.id === id);
    const { error } = await supabase.from('repair_orders').delete().eq('id', id);
    if (error) throw error;
    const updatedROs = repairOrders.filter(r => r.id !== id);
    setRepairOrders(updatedROs);
    if (ro) await syncVehicleRepairCosts(ro.vehicleId, updatedROs);
  };

  const addRepairOrderLine = async (repairOrderId, description, cost, notes) => {
    const { data: row, error } = await supabase
      .from('repair_order_lines')
      .insert({ repair_order_id: repairOrderId, description, cost: parseFloat(cost) || 0, notes: notes || null, status: 'pending' })
      .select()
      .single();
    if (error) throw error;
    const mapped = mapRepairOrderLine(row);
    const ro = repairOrders.find(r => r.id === repairOrderId);
    if (ro) {
      const newLines = [...ro.lines, mapped];
      const newTotal = newLines.reduce((s, l) => s + l.cost, 0);
      const { error: roErr } = await supabase.from('repair_orders').update({ total_cost: newTotal }).eq('id', repairOrderId);
      if (roErr) throw roErr;
      const updatedROs = repairOrders.map(r => r.id === repairOrderId ? { ...r, lines: newLines, totalCost: newTotal } : r);
      setRepairOrders(updatedROs);
      await syncVehicleRepairCosts(ro.vehicleId, updatedROs);
    }
    return mapped;
  };

  const deleteRepairOrderLine = async (lineId, repairOrderId) => {
    const { error } = await supabase.from('repair_order_lines').delete().eq('id', lineId);
    if (error) throw error;
    const ro = repairOrders.find(r => r.id === repairOrderId);
    if (ro) {
      const newLines = ro.lines.filter(l => l.id !== lineId);
      const newTotal = newLines.reduce((s, l) => s + l.cost, 0);
      const { error: roErr } = await supabase.from('repair_orders').update({ total_cost: newTotal }).eq('id', repairOrderId);
      if (roErr) throw roErr;
      const updatedROs = repairOrders.map(r => r.id === repairOrderId ? { ...r, lines: newLines, totalCost: newTotal } : r);
      setRepairOrders(updatedROs);
      await syncVehicleRepairCosts(ro.vehicleId, updatedROs);
    }
  };

  // ── Arbitration ───────────────────────────────────────────────────────────
  const fileArbitration = async (vehicleId, storeId, storeName, issueType, details) => {
    await updateVehicle(vehicleId, {
      arbitration: {
        status: 'open', storeId, storeName, issueType, details,
        filedAt: new Date().toISOString(), resolution: null, resolvedAt: null,
      },
    });
  };

  const resolveArbitration = async (vehicleId, resolutionType, resolutionDetails, adjustmentAmount) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;
    const arbUpdate = {
      ...vehicle.arbitration,
      status: 'resolved',
      resolution: resolutionType,
      resolutionDetails: resolutionDetails || null,
      adjustmentAmount: adjustmentAmount || null,
      resolvedAt: new Date().toISOString(),
    };
    if (resolutionType === 'fix_it') {
      await updateVehicle(vehicleId, { arbitration: arbUpdate, status: 'recon' });
      const vin6 = (vehicle.vin || '').slice(-6) || null;
      const desc = resolutionDetails || `Arbitration fix: ${vehicle.arbitration?.issueType || 'see claim'}`;
      await addRepairOrder(vehicleId, vin6, null, desc);
    } else {
      await updateVehicle(vehicleId, { arbitration: arbUpdate });
    }
  };

  // ── Store photos (in-memory — no Supabase table yet) ─────────────────────
  const updateStorePhoto = (storeId, photoData) => {
    setStorePhotos(prev => ({ ...prev, [storeId]: photoData }));
  };

  // ── Badges (in-memory) ────────────────────────────────────────────────────
  const BADGE_DEFS = [
    { id: 'first_bid',      label: 'First Pick',      icon: '🎯', desc: 'Placed your first ever bid' },
    { id: 'quick_draw',     label: 'Quick Draw',      icon: '⚡', desc: 'Bid within 5 min of auction opening' },
    { id: 'top_buyer',      label: 'Top Buyer',       icon: '👑', desc: 'Most cars won in a single auction' },
    { id: 'sharp_shooter',  label: 'Sharp Shooter',   icon: '🔫', desc: 'Won a car at exactly the floor price' },
    { id: 'hat_trick',      label: 'Hat Trick',       icon: '🎩', desc: 'Won 3+ cars in one auction' },
    { id: 'big_spender',    label: 'Big Spender',     icon: '💰', desc: 'Won a car over $30,000' },
    { id: 'loyal_bidder',   label: 'Loyal Bidder',    icon: '🤝', desc: 'Placed bids in 3+ auctions' },
    { id: 'clean_sweep',    label: 'Clean Sweep',     icon: '🧹', desc: 'Won every car you bid on in an auction' },
  ];

  const winnerLocationId = (vehicleId) => {
    const vBids = bids.filter(b => b.vehicleId === vehicleId);
    if (!vBids.length) return null;
    return vBids.reduce((top, b) => (!top || b.amount > top.amount) ? b : top, null)?.locationId;
  };

  const computeBadges = (locationId) => {
    const myBids = bids.filter(b => b.locationId === locationId);
    const myWins = vehicles.filter(v => v.status === 'awarded' && winnerLocationId(v.id) === locationId);
    const earned = [];

    if (myBids.length > 0) earned.push('first_bid');
    if (myWins.some(v => v.winningBid >= 30000)) earned.push('big_spender');
    if (myWins.some(v => v.floorPrice && v.winningBid === parseFloat(v.floorPrice))) earned.push('sharp_shooter');

    const winsByAuction = {};
    myWins.forEach(v => {
      const ah = auctions.find(a => a.closedDate && v.awardedAt
        && new Date(v.awardedAt) <= new Date(a.closedDate)
        && new Date(v.awardedAt) >= new Date(a.openDate || 0));
      const key = ah?.id || 'misc';
      winsByAuction[key] = (winsByAuction[key] || 0) + 1;
    });
    if (Object.values(winsByAuction).some(c => c >= 3)) earned.push('hat_trick');

    const winsByLocation = {};
    locations.forEach(l => {
      winsByLocation[l.id] = vehicles.filter(v => v.status === 'awarded' && winnerLocationId(v.id) === l.id).length;
    });
    const maxWins = Math.max(0, ...Object.values(winsByLocation));
    if (maxWins > 0 && winsByLocation[locationId] === maxWins) earned.push('top_buyer');

    const auctionParticipation = new Set(myBids.map(b => b.auctionId || b.placedAt?.substring(0, 10)));
    if (auctionParticipation.size >= 3) earned.push('loyal_bidder');

    const myBidVehicleIds = new Set(myBids.map(b => b.vehicleId));
    const myBidVehicles = vehicles.filter(v => myBidVehicleIds.has(v.id) && ['awarded', 'no_sale'].includes(v.status));
    if (myBidVehicles.length > 0 && myBidVehicles.every(v => winnerLocationId(v.id) === locationId)) earned.push('clean_sweep');

    return earned;
  };

  const checkAndAwardBadges = (locationId) => {
    if (currentAuction?.openDate) {
      const openTime = new Date(currentAuction.openDate);
      if ((new Date() - openTime) < 5 * 60 * 1000) {
        setBadges(prev => ({ ...prev, [locationId]: [...new Set([...(prev[locationId] || []), 'quick_draw'])] }));
      }
    }
    if (bids.filter(b => b.locationId === locationId).length === 0) {
      setBadges(prev => ({ ...prev, [locationId]: [...new Set([...(prev[locationId] || []), 'first_bid'])] }));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return <LoadingScreen message="Loading Stockyard…" />;
  if (fetchError) return (
    <div style={{ position: 'fixed', inset: 0, background: '#f8faff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Connection error</div>
      <div style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', maxWidth: 400, marginBottom: 24 }}>{fetchError}</div>
      <button onClick={() => window.location.reload()} style={{ background: '#0d2550', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Retry</button>
    </div>
  );

  const addPickupAddress = async (address) => {
    const { data: row, error } = await supabase.from('pickup_addresses').insert({ org_id: ORG_ID, address: address.trim() }).select().single();
    if (error) throw error;
    setPickupAddresses(prev => [...prev, row].sort((a, b) => a.address.localeCompare(b.address)));
    return row;
  };

  const addInspector = async (name) => {
    const { data: row, error } = await supabase.from('inspectors').insert({ org_id: ORG_ID, name: name.trim() }).select().single();
    if (error) throw error;
    setInspectors(prev => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
    return row;
  };

  const addAcquisitionSource = async (name) => {
    const { data: row, error } = await supabase.from('acquisition_sources').insert({ org_id: ORG_ID, name: name.trim() }).select().single();
    if (error) throw error;
    setAcquisitionSources(prev => [...prev, row]);
    return row;
  };
  const deleteAcquisitionSource = async (id) => {
    const { error } = await supabase.from('acquisition_sources').delete().eq('id', id);
    if (error) throw error;
    setAcquisitionSources(prev => prev.filter(s => s.id !== id));
  };
  const updateBuyerNumber = async (userId, buyerNumber) => {
    const { error } = await supabase.from('profiles').update({ buyer_number: buyerNumber || null }).eq('id', userId);
    if (error) throw error;
    const updated = p => p.id === userId ? { ...p, buyer_number: buyerNumber || null } : p;
    setBuyers(prev => prev.map(updated));
    setProfiles(prev => prev.map(updated));
  };

  const saveOrgSettings = async (settings) => {
    const { error } = await supabase.from('org_settings')
      .upsert({ org_id: ORG_ID, data: settings, updated_at: new Date().toISOString() }, { onConflict: 'org_id' });
    if (error) throw error;
    setOrgSettings(settings);
  };

  const addLocation = async (name) => {
    const { data: row, error } = await supabase.from('locations').insert({ org_id: ORG_ID, name: name.trim() }).select().single();
    if (error) throw error;
    setLocations(prev => [...prev, row]);
    return row;
  };
  const deleteLocation = async (id) => {
    const { error } = await supabase.from('locations').delete().eq('id', id);
    if (error) throw error;
    setLocations(prev => prev.filter(l => l.id !== id));
  };

  return (
    <DataContext.Provider value={{
      data,
      // Auction
      setAuction, openAuction, closeAuction,
      addAuction, updateAuction,
      // Vehicles
      addVehicle, updateVehicle, deleteVehicle, listVehicle, unlistVehicle, getMileage, logMileage, setVehicles,
      // Bids
      placeBid, addBid,
      getHighBid, getMyBid, getAllBidsForVehicle,
      // Transport
      updateTransport, deleteTransport,
      // Repair orders
      repairOrders, repairVendors,
      addRepairOrder, updateRepairOrder, deleteRepairOrder,
      addRepairVendor,
      // Arbitration
      fileArbitration, resolveArbitration,
      // Photos & badges
      updateStorePhoto, checkAndAwardBadges, computeBadges, BADGE_DEFS,
      // Inspectors
      addInspector,
      // Pickup addresses
      addPickupAddress,
      // Sources & locations
      addAcquisitionSource, deleteAcquisitionSource,
      addLocation, deleteLocation,
      updateBuyerNumber,
      saveOrgSettings,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() { return useContext(DataContext); }
