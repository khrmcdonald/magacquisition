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
    buyerNotes: r.buyer_responsibility_notes || null,
    generalNotes: r.general_notes || null,
    photos: Array.isArray(r.photos) ? r.photos : [],
    currentLocation: r.current_location_id,
    titleStatus: r.title_status || 'pending',
    titleNotes: r.title_notes || null,
    titleElectronic: r.title_electronic,
    title_tracker: r.title_tracker || null,
    inspection: r.inspection || null,
    keys: r.keys || null,
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
    engine: r.engine || null,
    soldPrice: r.sold_price || null,
    soldDate: r.sold_date || null,
    soldTo: r.sold_to || null,
    soldToAddress: r.sold_to_address || null,
    transportDriver: r.transport_driver || null,
    soldGross: r.sold_gross || null,
    originCountry: r.origin_country || 'US',
    isTrade: !!r.is_trade,
    purchasePriceCad: r.purchase_price_cad || null,
    exchangeRate: r.exchange_rate || null,
    bondReference: r.bond_reference || null,
    bondExpiration: r.bond_expiration || null,
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

function mapReserveClaim(r) {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    amount: parseFloat(r.amount) || 0,
    reason: r.reason,
    claimDate: r.claim_date,
    createdBy: r.created_by,
    createdAt: r.created_at,
  };
}

function mapVehicleAttachment(r) {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    docType: r.doc_type,
    fileUrl: r.file_url,
    fileName: r.file_name,
    uploadedBy: r.uploaded_by,
    createdAt: r.created_at,
  };
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
  buyerNotes: 'buyer_responsibility_notes',
  generalNotes: 'general_notes',
  photos: 'photos',
  currentLocation: 'current_location_id',
  titleStatus: 'title_status', titleElectronic: 'title_electronic',
  titleNotes: 'title_notes',
  inspection: 'inspection',
  keys: 'keys',
  canListBeforeTitle: 'can_list_before_title',
  winnerId: 'winner_id', winnerName: 'winner_name', winningBid: 'winning_bid',
  awardedAt: 'awarded_at',
  interior_color: 'interior_color',
  buyer_id: 'buyer_id',
  buyer_name: 'buyer_name',
  arbitration: 'arbitration',
  engine: 'engine',
  soldPrice: 'sold_price',
  soldDate: 'sold_date',
  soldTo: 'sold_to',
  soldToAddress: 'sold_to_address',
  transportDriver: 'transport_driver',
  soldGross: 'sold_gross',
  originCountry: 'origin_country',
  isTrade: 'is_trade',
  purchasePriceCad: 'purchase_price_cad',
  exchangeRate: 'exchange_rate',
  bondReference: 'bond_reference',
  bondExpiration: 'bond_expiration',
};

// Numeric vehicles columns — coerce so a cleared/stray-character input doesn't
// reach Postgres as '' (invalid input syntax for type numeric).
const NUMERIC_FIELDS = new Set([
  'purchase_price', 'overhead_costs', 'floor_price', 'opening_bid', 'list_price',
  'winning_bid', 'sold_price', 'sold_gross',
  'purchase_price_cad', 'exchange_rate',
]);

// Date-typed vehicles columns — coerce '' to null so an unset date field
// (e.g. bond_expiration on non-Canada units) doesn't reach Postgres as ''
// (invalid input syntax for type date).
const DATE_FIELDS = new Set([
  'date_purchased', 'sold_date', 'bond_expiration',
]);

function toSnakeCase(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    const key = VEHICLE_FIELD_MAP[k] || k;
    if (NUMERIC_FIELDS.has(key)) out[key] = (v === '' || v == null) ? null : parseFloat(v);
    else if (DATE_FIELDS.has(key)) out[key] = (v === '' || v == null) ? null : v;
    else out[key] = v;
  }
  return out;
}

// ── Provider ──────────────────────────────────────────────────────────────
export function DataProvider({ children }) {
  const [vehicles, setVehicles] = useState([]);
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
  const [destinations, setDestinations] = useState([]);
  const [orgSettings, setOrgSettings] = useState({});
  const [reserveClaims, setReserveClaims] = useState([]);
  const [fetchError, setFetchError] = useState(null);

  // ── Initial data fetch ───────────────────────────────────────────────────
  useEffect(() => {
    async function fetchAll() {
      const [vehiclesRes, locationsRes, sourcesRes, transportRes, repairOrdersRes, repairVendorsRes, buyersRes, inspectorsRes, pickupAddressesRes, destinationsRes, mileageRes, orgSettingsRes, reserveClaimsRes] = await Promise.all([
        supabase.from('vehicles').select('*').eq('org_id', ORG_ID),
        supabase.from('locations').select('*').or(`org_id.eq.${ORG_ID},org_id.is.null`),
        supabase.from('acquisition_sources').select('*').eq('org_id', ORG_ID),
        supabase.from('transport').select('*').eq('org_id', ORG_ID),
        supabase.from('repair_orders').select('*, repair_order_lines(*)').eq('org_id', ORG_ID),
        supabase.from('repair_vendors').select('*').eq('org_id', ORG_ID).eq('active', true),
        supabase.from('profiles').select('id, name, buyer_number, role').eq('org_id', ORG_ID),
        supabase.from('inspectors').select('*').eq('org_id', ORG_ID).eq('active', true).order('name'),
        supabase.from('pickup_addresses').select('*').eq('org_id', ORG_ID).eq('active', true).order('address'),
        supabase.from('destinations').select('*').eq('org_id', ORG_ID).eq('active', true).order('name'),
        supabase.from('mileage_log').select('vehicle_id, reading, logged_at').eq('org_id', ORG_ID).order('logged_at', { ascending: false }),
        supabase.from('org_settings').select('data').eq('org_id', ORG_ID).maybeSingle(),
        supabase.from('reserve_claims').select('*').eq('org_id', ORG_ID).order('claim_date', { ascending: false }),
      ]);
      if (vehiclesRes.error) {
        setFetchError('Could not load vehicle data. Check your connection and refresh the page.');
        setLoading(false);
        return;
      }
      if (locationsRes.error)     console.warn('locations fetch error:',     locationsRes.error?.message);
      if (sourcesRes.error)       console.warn('sources fetch error:',       sourcesRes.error?.message);
      if (transportRes.error)     console.warn('transport fetch error:',     transportRes.error?.message);
      if (repairOrdersRes.error)  console.warn('repair_orders fetch error:', repairOrdersRes.error?.message);
      if (repairVendorsRes.error)    console.warn('repair_vendors fetch error:',    repairVendorsRes.error?.message);
      if (inspectorsRes.error)       console.warn('inspectors fetch error:',       inspectorsRes.error?.message);
      if (pickupAddressesRes.error)  console.warn('pickup_addresses fetch error:', pickupAddressesRes.error?.message);
      if (destinationsRes.error)     console.warn('destinations fetch error:',    destinationsRes.error?.message);
      if (reserveClaimsRes.error)    console.warn('reserve_claims fetch error:',  reserveClaimsRes.error?.message);

      if (vehiclesRes.data) {
        const mileageMap = {};
        mileageRes.data?.forEach(r => { if (!mileageMap[r.vehicle_id]) mileageMap[r.vehicle_id] = r.reading; });
        setVehicles(vehiclesRes.data.map(r => ({ ...mapVehicle(r), mileage: mileageMap[r.id] ?? null })));
      }
      if (buyersRes.data) {
        setBuyers(buyersRes.data.filter(p => p.role === 'wholesale'));
        setProfiles(buyersRes.data);
      }
      if (locationsRes.data)     setLocations(locationsRes.data);
      if (sourcesRes.data)       setAcquisitionSources(sourcesRes.data);
      if (transportRes.data)     setTransport(transportRes.data.map(mapTransport));
      if (repairOrdersRes.data)  setRepairOrders(repairOrdersRes.data.map(mapRepairOrder));
      if (repairVendorsRes.data) setRepairVendors(repairVendorsRes.data.map(mapRepairVendor));
      if (inspectorsRes.data)      setInspectors(inspectorsRes.data);
      if (pickupAddressesRes.data) setPickupAddresses(pickupAddressesRes.data);
      if (destinationsRes.data)    setDestinations(destinationsRes.data);
      if (orgSettingsRes.data?.data) setOrgSettings(orgSettingsRes.data.data);
      if (reserveClaimsRes.data)     setReserveClaims(reserveClaimsRes.data.map(mapReserveClaim));
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
      supabase.removeChannel(transportSub);
    };
  }, []);

  // ── Derived backward-compatible `data` object ────────────────────────────
  // `auction`/`bids`/`auctionHistory` are static empties — the bidding/auction
  // system was retired, but a few read-only UI spots still reference these
  // shapes defensively (e.g. Inventory's bid-count badge).
  const data = {
    auction: { isOpen: false, openDate: null, closeDate: null, label: '' },
    vehicles,
    bids: [],
    transport,
    repairOrders,
    repairVendors,
    auctionHistory: [],
    locations,
    acquisition_sources: acquisitionSources,
    buyers,
    profiles,
    inspectors,
    pickupAddresses,
    destinations,
    orgSettings,
    reserveClaims,
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
      vin:                 vehicle.vin?.trim()       || null,
      year:                vehicle.year             || null,
      make:                vehicle.make             || null,
      model:               vehicle.model            || null,
      trim:                vehicle.trim             || null,
      color:               vehicle.color            || null,
      interior_color:      vehicle.interior_color   || null,
      engine:              vehicle.engine           || null,
      condition:           vehicle.condition        || null,
      current_location_id: vehicle.currentLocation  || null,
      purchase_price:      vehicle.purchasePrice    ? parseFloat(vehicle.purchasePrice)  : null,
      overhead_costs:      vehicle.overheadCosts    ? parseFloat(vehicle.overheadCosts)  : null,
      floor_price:         vehicle.floorPrice       ? parseFloat(vehicle.floorPrice)     : null,
      list_price:          vehicle.listPrice        ? parseFloat(vehicle.listPrice)      : null,
      title_status:        vehicle.titleStatus      || null,
      date_purchased:      vehicle.datePurchased    || null,
      source_id:           vehicle.sourceId || vehicle.source_id || null,
      buyer_id:            vehicle.buyer_id         || null,
      buyer_name:          vehicle.buyer_name       || null,
      disclosure_notes:    vehicle.notes            || null,
      buyer_responsibility_notes: vehicle.buyerNotes || null,
      general_notes:       vehicle.generalNotes     || null,
      photos:              Array.isArray(vehicle.photos) ? vehicle.photos : [],
      keys:                vehicle.keys             || null,
      origin_country:      vehicle.originCountry    || 'US',
      is_trade:            !!vehicle.isTrade,
      purchase_price_cad:  vehicle.purchasePriceCad ? parseFloat(vehicle.purchasePriceCad) : null,
      exchange_rate:       vehicle.exchangeRate     ? parseFloat(vehicle.exchangeRate)      : null,
      bond_reference:      vehicle.bondReference    || null,
      bond_expiration:     vehicle.bondExpiration   || null,
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

  const addTransport = async (vehicle, { type, storeName, scheduledDate, notes }) => {
    const row = {
      id: crypto.randomUUID(),
      org_id: ORG_ID,
      vehicle_id: vehicle.id,
      vehicle_name: `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim(),
      store_id: null,
      store_name: type === 'inbound' ? 'Intake' : (storeName || ''),
      winning_bid: null,
      status: 'awarded',
      notes: notes || null,
      scheduled_date: scheduledDate ? new Date(scheduledDate).toISOString() : null,
      steps: { awarded: new Date().toISOString() },
    };
    const { data: inserted, error } = await supabase.from('transport').insert(row).select().single();
    if (error) throw error;
    const mapped = mapTransport(inserted);
    setTransport(prev => [...prev, mapped]);
    return mapped;
  };

  const deleteTransport = async (id) => {
    const { error } = await supabase.from('transport').delete().eq('id', id);
    if (error) throw error;
    setTransport(prev => prev.filter(t => t.id !== id));
  };

  const closeArrivedTransport = async () => {
    const arrivedIds = transport.filter(t => ['arrived', 'titleReceived'].includes(t.status)).map(t => t.id);
    if (!arrivedIds.length) return 0;
    const { error } = await supabase.from('transport').delete().in('id', arrivedIds);
    if (error) throw error;
    setTransport(prev => prev.filter(t => !arrivedIds.includes(t.id)));
    return arrivedIds.length;
  };

  const updateTransportSchedule = async (id, scheduledDate) => {
    const { error } = await supabase.from('transport')
      .update({ scheduled_date: scheduledDate || null })
      .eq('id', id);
    if (error) throw error;
    setTransport(prev => prev.map(t => t.id === id ? { ...t, scheduledDate: scheduledDate || null } : t));
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
    // Auto-move vehicle to recon when a repair order is added
    const vehicle = vehicles.find(v => v.id === vehicleId);
    const reconEligible = ['intake', 'arbitration', 'inspection', 'ready', 'no_sale'];
    if (vehicle && reconEligible.includes(vehicle.status)) {
      await supabase.from('vehicles').update({ status: 'recon' }).eq('id', vehicleId);
      setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, status: 'recon' } : v));
    }
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

  const getMileageHistory = async (vehicleId) => {
    const { data } = await supabase
      .from('mileage_log')
      .select('reading, reason, logged_at')
      .eq('vehicle_id', vehicleId)
      .order('logged_at', { ascending: false });
    return data || [];
  };

  // ── Attachments (fetched on-demand per vehicle, not eagerly for the org) ──
  const getVehicleAttachments = async (vehicleId) => {
    const { data } = await supabase
      .from('vehicle_attachments')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false });
    return (data || []).map(mapVehicleAttachment);
  };

  const addVehicleAttachment = async ({ vehicleId, docType, fileUrl, fileName, uploadedBy }) => {
    const { data: row, error } = await supabase
      .from('vehicle_attachments')
      .insert({
        org_id: ORG_ID,
        vehicle_id: vehicleId,
        doc_type: docType || null,
        file_url: fileUrl,
        file_name: fileName || null,
        uploaded_by: uploadedBy || null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapVehicleAttachment(row);
  };

  const deleteVehicleAttachment = async (id) => {
    const { error } = await supabase.from('vehicle_attachments').delete().eq('id', id);
    if (error) throw error;
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

  const addDestination = async (name, address) => {
    const { data: row, error } = await supabase.from('destinations').insert({ org_id: ORG_ID, name: name.trim(), address: address?.trim() || null }).select().single();
    if (error) throw error;
    setDestinations(prev => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
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

  const addReserveClaim = async ({ amount, reason, vehicleId, claimDate, createdBy }) => {
    const payload = {
      org_id: ORG_ID,
      amount: parseFloat(amount),
      reason: reason?.trim() || null,
      vehicle_id: vehicleId || null,
      claim_date: claimDate || new Date().toISOString().slice(0, 10),
      created_by: createdBy || null,
    };
    const { data: row, error } = await supabase.from('reserve_claims').insert(payload).select().single();
    if (error) throw error;
    setReserveClaims(prev => [mapReserveClaim(row), ...prev]);
    return row;
  };
  const deleteReserveClaim = async (id) => {
    const { error } = await supabase.from('reserve_claims').delete().eq('id', id);
    if (error) throw error;
    setReserveClaims(prev => prev.filter(c => c.id !== id));
  };
  const updateProfile = async (userId, { name, role, buyerNumber }) => {
    const { error } = await supabase.from('profiles')
      .update({ name, role, buyer_number: buyerNumber || null })
      .eq('id', userId);
    if (error) throw error;
    // Re-fetch to get fresh state including any newly registered users
    const { data: fresh } = await supabase.from('profiles')
      .select('id, name, buyer_number, role').eq('org_id', ORG_ID);
    if (fresh) {
      setBuyers(fresh.filter(p => p.role === 'wholesale'));
      setProfiles(fresh);
    }
  };
  const updateBuyerNumber = async (userId, buyerNumber) => {
    const existing = profiles.find(p => p.id === userId);
    await updateProfile(userId, { name: existing?.name, role: existing?.role, buyerNumber });
  };

  const deleteUser = async (userId) => {
    // Nullify buyer_id on their vehicles (don't delete the vehicles)
    await supabase.from('vehicles').update({ buyer_id: null }).eq('buyer_id', userId).eq('org_id', ORG_ID);
    // Delete their bids
    await supabase.from('bids').delete().eq('user_id', userId);
    // Delete profile (removes app access; auth account remains but is blocked)
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) throw error;
    // Update local state
    setProfiles(prev => prev.filter(p => p.id !== userId));
    setBuyers(prev => prev.filter(p => p.id !== userId));
    setVehicles(prev => prev.map(v => v.buyerId === userId ? { ...v, buyerId: null, buyerName: null } : v));
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
      // Vehicles
      addVehicle, updateVehicle, deleteVehicle, getMileage, logMileage, setVehicles,
      // Transport
      addTransport, updateTransport, deleteTransport, closeArrivedTransport, updateTransportSchedule,
      // Repair orders
      repairOrders, repairVendors,
      addRepairOrder, updateRepairOrder, deleteRepairOrder,
      addRepairOrderLine, deleteRepairOrderLine, getMileageHistory,
      getVehicleAttachments, addVehicleAttachment, deleteVehicleAttachment,
      addRepairVendor,
      // Inspectors
      addInspector,
      // Pickup addresses
      addPickupAddress,
      // Destinations (outside-sale transport orders)
      addDestination,
      // Sources & locations
      addAcquisitionSource, deleteAcquisitionSource,
      addLocation, deleteLocation,
      // Reserve fund ledger
      addReserveClaim, deleteReserveClaim,
      updateProfile,
      updateBuyerNumber,
      deleteUser,
      saveOrgSettings,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() { return useContext(DataContext); }
