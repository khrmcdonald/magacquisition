import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const DataContext = createContext(null);
const ORG_ID = 'bf236d2b-4693-4606-bf3d-ece1767690ab';

// Fields that must never be sent to the vehicles table (computed, read-only, or non-existent columns).
// Applied as a final filter in both addVehicle and updateVehicle.
const STRIP_FIELDS = new Set([
  'createdAt', 'created_at', 'vin6', 'total_cost_basis', 'totalCost', 'totalCostBasis', 'listedAt', 'listed_at',
  'reconCosts', 'recon_costs', 'reconItems', 'recon_items', 'reconNotes', 'recon_notes',
  'vendorNotes', 'vendor_notes', 'titleNotes', 'title_notes', 'notes', 'mileage',
  'source', 'storeId', 'store_id', 'winnerId', 'winner_id', 'updatedAt', 'updated_at',
  'arbitration', 'arbitrationStatus', 'arbitration_status', 'arbitrationNotes', 'arbitration_notes',
]);

// ── Column mappers: Supabase snake_case → app camelCase ───────────────────
function mapVehicle(r) {
  return {
    id: r.id,
    status: r.status,
    year: r.year, make: r.make, model: r.model, trim: r.trim,
    color: r.color, mileage: r.mileage, vin: r.vin,
    condition: r.condition, source: r.source,
    purchasePrice: r.purchase_price,
    overheadCosts: r.overhead_costs,
    reconCosts: r.recon_costs,
    totalCost: (parseFloat(r.purchase_price) || 0) + (parseFloat(r.overhead_costs) || 0) + (parseFloat(r.recon_costs) || 0) || null,
    floorPrice: r.floor_price,
    notes: r.notes, photos: Array.isArray(r.photos) ? r.photos : [],
    currentLocation: r.current_location,
    titleStatus: r.title_status,
    titleNotes: r.title_notes,
    winnerId: r.winner_id,
    winnerName: r.winner_name,
    winningBid: r.winning_bid,
    awardedAt: r.awarded_at,
    listedAt: r.listed_at,
    createdAt: r.created_at,
    arbitration: r.arbitration,
  };
}

function mapBid(r) {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    storeId: r.store_id,
    storeName: r.store_name,
    amount: r.amount,
    auctionId: r.auction_id,
    placedAt: r.placed_at,
    updatedAt: r.updated_at,
  };
}

function mapAuction(r) {
  return {
    id: r.id,
    // Support both is_open (boolean) and status (string) column conventions
    isOpen: r.is_open === true || r.status === 'open',
    openDate: r.open_date,
    closeDate: r.close_date,
    label: r.label,
    closedDate: r.closed_date,
    vehicleCount: r.vehicle_count,
    awardedCount: r.awarded_count,
    noSaleCount: r.no_sale_count,
    totalVolume: r.total_volume,
  };
}

function mapTransport(r) {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    vehicleName: r.vehicle_name,
    storeId: r.store_id,
    storeName: r.store_name,
    winningBid: r.winning_bid,
    status: r.status,
    notes: r.notes,
    steps: r.steps || {},
    createdAt: r.created_at,
  };
}

// Map camelCase vehicle fields back to snake_case for Supabase writes
const VEHICLE_FIELD_MAP = {
  status: 'status', year: 'year', make: 'make', model: 'model', trim: 'trim',
  color: 'color', mileage: 'mileage', vin: 'vin', condition: 'condition', source: 'source',
  purchasePrice: 'purchase_price', overheadCosts: 'overhead_costs',
  reconCosts: 'recon_costs', totalCost: 'total_cost', floorPrice: 'floor_price',
  notes: 'notes', photos: 'photos', currentLocation: 'current_location',
  titleStatus: 'title_status', titleNotes: 'title_notes',
  winnerId: 'winner_id', winnerName: 'winner_name', winningBid: 'winning_bid',
  awardedAt: 'awarded_at', arbitration: 'arbitration',
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
  const [loading, setLoading] = useState(true);

  const [transport, setTransport] = useState([]);
  const [badges, setBadges] = useState({});
  const [storePhotos, setStorePhotos] = useState({});

  // ── Initial data fetch ───────────────────────────────────────────────────
  useEffect(() => {
    async function fetchAll() {
      const [vehiclesRes, auctionsRes, bidsRes, locationsRes, sourcesRes, transportRes] = await Promise.all([
        supabase.from('vehicles').select('*').eq('org_id', ORG_ID),
        supabase.from('auctions').select('*').eq('org_id', ORG_ID),
        supabase.from('bids').select('*').eq('org_id', ORG_ID),
        supabase.from('locations').select('*').eq('org_id', ORG_ID),
        supabase.from('acquisition_sources').select('*').eq('org_id', ORG_ID),
        supabase.from('transport').select('*').eq('org_id', ORG_ID),
      ]);
      if (vehiclesRes.error)   console.log('vehicles fetch error:',  JSON.stringify(vehiclesRes.error));
      if (auctionsRes.error)   console.log('auctions fetch error:',  JSON.stringify(auctionsRes.error));
      if (bidsRes.error)       console.log('bids fetch error:',      JSON.stringify(bidsRes.error));
      if (locationsRes.error)  console.log('locations fetch error:', JSON.stringify(locationsRes.error));
      if (sourcesRes.error)    console.log('sources fetch error:',   JSON.stringify(sourcesRes.error));
      if (transportRes.error)  console.log('transport fetch error:', JSON.stringify(transportRes.error));

      if (vehiclesRes.data)   setVehicles(vehiclesRes.data.map(mapVehicle));
      if (auctionsRes.data)   setAuctions(auctionsRes.data.map(mapAuction));
      if (bidsRes.data)       setBids(bidsRes.data.map(mapBid));
      if (locationsRes.data)  setLocations(locationsRes.data);
      if (sourcesRes.data)    setAcquisitionSources(sourcesRes.data);
      if (transportRes.data)  setTransport(transportRes.data.map(mapTransport));
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
          if (eventType === 'UPDATE') return prev.map(v => v.id === row.id ? mapVehicle(row) : v);
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
        filter: `org_id=eq.${ORG_ID}`,
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
    if ('closeDate' in fields) mapped.close_date = fields.closeDate;
    if ('label' in fields) mapped.label = fields.label;
    await updateAuction(currentAuction.id, mapped);
  };

  const openAuction = async (closeDate, label) => {
    await addAuction({
      status: 'open',
      open_date: new Date().toISOString(),
      close_date: closeDate,
      label: label || '',
    });
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
          awardedCount++;
          totalVolume += winner.amount;
          vehicleUpdates.push(
            supabase.from('vehicles').update({
              status: 'awarded',
              winner_id: winner.storeId,
              winner_name: winner.storeName,
              winning_bid: winner.amount,
              awarded_at: now,
            }).eq('id', v.id)
          );
          if (!transport.find(t => t.vehicleId === v.id)) {
            newTransport.push({
              id: 'tr_' + v.id,
              vehicleId: v.id,
              vehicleName: `${v.year} ${v.make} ${v.model}`,
              storeId: winner.storeId,
              storeName: winner.storeName,
              winningBid: winner.amount,
              status: 'awarded',
              steps: { awarded: now, dispatched: null, inTransit: null, arrived: null, titleReceived: null },
            });
          }
        }
      }
    }

    await Promise.all(vehicleUpdates);
    await updateAuction(currentAuction.id, { status: 'closed' });
    setAuctions(prev => prev.map(a => a.id === currentAuction.id ? { ...a, isOpen: false } : a));

    if (newTransport.length) {
      await supabase.from('transport').insert(newTransport.map(t => ({
        id: t.id,
        org_id: ORG_ID,
        vehicle_id: t.vehicleId,
        vehicle_name: t.vehicleName,
        store_id: t.storeId,
        store_name: t.storeName,
        winning_bid: t.winningBid,
        status: t.status,
        steps: t.steps,
      })));
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
      condition:           vehicle.condition        || null,
      purchase_price:      vehicle.purchasePrice    ? parseFloat(vehicle.purchasePrice)  : null,
      overhead_costs:      vehicle.overheadCosts    ? parseFloat(vehicle.overheadCosts)  : null,
      floor_price:         vehicle.floorPrice       ? parseFloat(vehicle.floorPrice)     : null,
      list_price:          vehicle.listPrice        ? parseFloat(vehicle.listPrice)      : null,
      title_status:        vehicle.titleStatus      || null,
      current_location_id: asUuid(vehicle.currentLocation),
      photos:              Array.isArray(vehicle.photos) ? vehicle.photos : [],
    });

    const { data: row, error } = await supabase
      .from('vehicles')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return row;
  };

  const updateVehicle = async (id, fields) => {
    const clean = stripPayload(toSnakeCase(
      Object.fromEntries(Object.entries(fields).filter(([k]) => !STRIP_FIELDS.has(k)))
    ));
    setVehicles(prev => prev.map(v => v.id === id ? { ...v, ...fields } : v));
    const { error } = await supabase
      .from('vehicles')
      .update(clean)
      .eq('id', id);
    if (error) throw error;
  };

  const deleteVehicle = async (id) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) throw error;
  };

  const listVehicle = async (id) => {
    await updateVehicle(id, { status: 'in_auction' });
  };

  const unlistVehicle = async (id) => {
    await updateVehicle(id, { status: 'ready' });
    const { error } = await supabase.from('bids').delete().eq('vehicle_id', id);
    if (error) throw error;
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

  // ── Bid mutations ─────────────────────────────────────────────────────────
  // Primary: one bid per store per vehicle per auction (upserts)
  const addBid = async (bid) => {
    const { error } = await supabase
      .from('bids')
      .upsert({
        org_id: ORG_ID,
        vehicle_id: bid.vehicleId,
        store_id: bid.storeId,
        store_name: bid.storeName,
        amount: bid.amount,
        auction_id: bid.auctionId,
        placed_at: bid.placedAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'vehicle_id,store_id,auction_id' });
    if (error) throw error;
  };

  // Backward-compat wrapper used by existing components
  const placeBid = async (vehicleId, storeId, storeName, amount) => {
    await addBid({ vehicleId, storeId, storeName, amount, auctionId: currentAuction?.id });
    checkAndAwardBadges(storeId, amount);
  };

  // ── Bid helpers ───────────────────────────────────────────────────────────
  const getHighBid = (vehicleId) => {
    const vBids = bids.filter(b => b.vehicleId === vehicleId);
    if (!vBids.length) return null;
    return Math.max(...vBids.map(b => b.amount));
  };

  const getMyBid = (vehicleId, storeId) =>
    bids.find(b => b.vehicleId === vehicleId && b.storeId === storeId) || null;

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

  // ── Arbitration ───────────────────────────────────────────────────────────
  const fileArbitration = async (vehicleId, storeId, storeName, issueType, details) => {
    await updateVehicle(vehicleId, {
      arbitration: {
        status: 'open', storeId, storeName, issueType, details,
        filedAt: new Date().toISOString(), resolution: null, resolvedAt: null,
      },
    });
  };

  const resolveArbitration = async (vehicleId, resolution) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;
    await updateVehicle(vehicleId, {
      arbitration: { ...vehicle.arbitration, status: 'resolved', resolution, resolvedAt: new Date().toISOString() },
    });
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

  const computeBadges = (storeId) => {
    const myWins = vehicles.filter(v => v.status === 'awarded' && v.winnerId === storeId);
    const myBids = bids.filter(b => b.storeId === storeId);
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

    const allWinsByStore = {};
    ['SAG', 'KIA', 'CLR', 'MIL', 'MAR'].forEach(s => {
      allWinsByStore[s] = vehicles.filter(v => v.status === 'awarded' && v.winnerId === s).length;
    });
    const maxWins = Math.max(...Object.values(allWinsByStore));
    if (maxWins > 0 && allWinsByStore[storeId] === maxWins) earned.push('top_buyer');

    const auctionParticipation = new Set(myBids.map(b => b.auctionId || b.placedAt?.substring(0, 10)));
    if (auctionParticipation.size >= 3) earned.push('loyal_bidder');

    const myBidVehicleIds = new Set(myBids.map(b => b.vehicleId));
    const myBidVehicles = vehicles.filter(v => myBidVehicleIds.has(v.id) && ['awarded', 'no_sale'].includes(v.status));
    if (myBidVehicles.length > 0 && myBidVehicles.every(v => v.winnerId === storeId)) earned.push('clean_sweep');

    return earned;
  };

  const checkAndAwardBadges = (storeId) => {
    if (currentAuction?.openDate) {
      const openTime = new Date(currentAuction.openDate);
      if ((new Date() - openTime) < 5 * 60 * 1000) {
        setBadges(prev => ({ ...prev, [storeId]: [...new Set([...(prev[storeId] || []), 'quick_draw'])] }));
      }
    }
    if (bids.filter(b => b.storeId === storeId).length === 0) {
      setBadges(prev => ({ ...prev, [storeId]: [...new Set([...(prev[storeId] || []), 'first_bid'])] }));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return null;

  return (
    <DataContext.Provider value={{
      data,
      // Auction
      setAuction, openAuction, closeAuction,
      addAuction, updateAuction,
      // Vehicles
      addVehicle, updateVehicle, deleteVehicle, listVehicle, unlistVehicle, getMileage,
      // Bids
      placeBid, addBid,
      getHighBid, getMyBid, getAllBidsForVehicle,
      // Transport
      updateTransport,
      // Arbitration
      fileArbitration, resolveArbitration,
      // Photos & badges
      updateStorePhoto, checkAndAwardBadges, computeBadges, BADGE_DEFS,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() { return useContext(DataContext); }
