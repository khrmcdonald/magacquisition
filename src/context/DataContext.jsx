import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DataContext = createContext(null);

const STORAGE_KEY = 'mag_data';

// Collision-proof unique id. Date.now() alone repeats within the same
// millisecond, so bulk operations (e.g. spreadsheet import) would hand every
// row the same id. The counter + random suffix guarantee uniqueness even when
// many ids are minted in a single synchronous loop.
let _idSeq = 0;
function uid(prefix) {
  _idSeq = (_idSeq + 1) % 1000000;
  return `${prefix}${Date.now().toString(36)}_${_idSeq}_${Math.random().toString(36).slice(2, 8)}`;
}

// Repair data that was saved before unique ids were guaranteed: any vehicle
// that has no id or shares an id with an earlier vehicle gets a fresh one.
function dedupeVehicleIds(vehicles) {
  if (!Array.isArray(vehicles)) return vehicles;
  const seen = new Set();
  return vehicles.map(v => {
    if (!v) return v;
    if (!v.id || seen.has(v.id)) {
      const id = uid('v_');
      seen.add(id);
      return { ...v, id };
    }
    seen.add(v.id);
    return v;
  });
}

const DEFAULT_DATA = {
  auction: {
    isOpen: false,
    openDate: null,
    closeDate: null,
    label: '',
  },
  vehicles: [],
  bids: [],
  transport: [],
  auctionHistory: [],
  badges: {},
  storePhotos: {},
  approvedVendors: [],
};

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = { ...DEFAULT_DATA, ...JSON.parse(raw) };
      parsed.vehicles = dedupeVehicleIds(parsed.vehicles);
      return parsed;
    }
  } catch {}
  return DEFAULT_DATA;
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function DataProvider({ children }) {
  const [data, setData] = useState(loadData);

  // Persist any load-time id repair so it survives reloads and so every later
  // read (e.g. computeBadges) sees the same stable ids.
  useEffect(() => { saveData(data); }, []);

  const update = useCallback((updater) => {
    setData(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveData(next);
      return next;
    });
  }, []);

  // --- Auction ---
  const setAuction = (fields) => update(d => ({ ...d, auction: { ...d.auction, ...fields } }));

  const openAuction = (closeDate, label) => {
    update(d => ({
      ...d,
      auction: { isOpen: true, openDate: new Date().toISOString(), closeDate, label: label || d.auction.label },
      auctionHistory: [...(d.auctionHistory || []), {
        id: 'ah_' + Date.now(),
        event: 'opened',
        label: label || d.auction.label,
        openDate: new Date().toISOString(),
        closeDate,
        vehicleCount: d.vehicles.filter(v => v.status === 'active').length,
      }]
    }));
  };

  const closeAuction = () => {
    update(d => {
      const vehicles = d.vehicles.map(v => {
        if (v.status !== 'active') return v;
        const vehicleBids = d.bids.filter(b => b.vehicleId === v.id);
        if (vehicleBids.length === 0) return { ...v, status: 'no_sale' };
        const sorted = [...vehicleBids].sort((a, b) => b.amount - a.amount);
        const winner = sorted[0];
        if (v.floorPrice && winner.amount < v.floorPrice) return { ...v, status: 'no_sale' };
        return { ...v, status: 'awarded', winnerId: winner.storeId, winnerName: winner.storeName, winningBid: winner.amount, awardedAt: new Date().toISOString() };
      });

      const newTransport = vehicles
        .filter(v => v.status === 'awarded' && !d.transport.find(t => t.vehicleId === v.id))
        .map(v => ({
          id: 'tr_' + v.id,
          vehicleId: v.id,
          vehicleName: `${v.year} ${v.make} ${v.model}`,
          storeId: v.winnerId,
          storeName: v.winnerName,
          winningBid: v.winningBid,
          status: 'pending',
          steps: {
            awarded: new Date().toISOString(),
            dispatched: null,
            inTransit: null,
            arrived: null,
            titleReceived: null,
          }
        }));

      const awarded = vehicles.filter(v => v.status === 'awarded' && !d.vehicles.find(dv => dv.id === v.id && dv.status === 'awarded'));
      const histEntry = (d.auctionHistory || []).findIndex(h => h.event === 'opened' && !h.closedDate);
      const updatedHistory = [...(d.auctionHistory || [])];
      if (histEntry >= 0) {
        updatedHistory[histEntry] = {
          ...updatedHistory[histEntry],
          event: 'closed',
          closedDate: new Date().toISOString(),
          vehicleCount: vehicles.filter(v => ['awarded','no_sale'].includes(v.status)).length,
          awardedCount: vehicles.filter(v => v.status === 'awarded').length,
          noSaleCount: vehicles.filter(v => v.status === 'no_sale').length,
          totalVolume: vehicles.filter(v => v.status === 'awarded').reduce((s,v) => s + (v.winningBid||0), 0),
        };
      }
      return {
        ...d,
        auction: { ...d.auction, isOpen: false },
        vehicles,
        transport: [...d.transport, ...newTransport],
        auctionHistory: updatedHistory,
      };
    });
  };

  // Direct "sell now" — skip the auction entirely and sell a vehicle straight
  // to a store at an agreed price. Produces the same awarded vehicle + transport
  // record that closing an auction would, so the sale flows through Logistics,
  // My Wins, History and the accounting export with no extra handling.
  const directSale = (vehicleId, buyerId, buyerName, price, note) => {
    update(d => {
      const v = d.vehicles.find(vv => vv.id === vehicleId);
      if (!v) return d;
      const soldAt = new Date().toISOString();
      const amount = parseFloat(price) || 0;
      const vehicleName = `${v.year} ${v.make} ${v.model}`;

      const vehicles = d.vehicles.map(vv => vv.id === vehicleId ? {
        ...vv,
        status: 'awarded',
        winnerId: buyerId,
        winnerName: buyerName,
        winningBid: amount,
        awardedAt: soldAt,
        saleType: 'direct',
        saleNote: note || vv.saleNote || '',
      } : vv);

      // A direct sale bypasses bidding, so drop any stray bids on this vehicle.
      const bids = d.bids.filter(b => b.vehicleId !== vehicleId);

      // Mirror closeAuction: open a transport record if one doesn't exist yet.
      const transport = d.transport.find(t => t.vehicleId === vehicleId)
        ? d.transport
        : [...d.transport, {
            id: 'tr_' + vehicleId,
            vehicleId,
            vehicleName,
            storeId: buyerId,
            storeName: buyerName,
            winningBid: amount,
            status: 'pending',
            saleType: 'direct',
            notes: note || '',
            steps: {
              awarded: soldAt,
              dispatched: null,
              inTransit: null,
              arrived: null,
              titleReceived: null,
            },
          }];

      // Log it in the audit trail as a one-vehicle sale, opened and closed at once.
      const auctionHistory = [...(d.auctionHistory || []), {
        id: 'ds_' + Date.now(),
        event: 'direct_sale',
        label: `Direct sale — ${vehicleName} → ${buyerName}`,
        openDate: soldAt,
        closedDate: soldAt,
        vehicleCount: 1,
        awardedCount: 1,
        noSaleCount: 0,
        totalVolume: amount,
      }];

      return { ...d, vehicles, bids, transport, auctionHistory };
    });
  };

  // --- Vehicles ---
  const addVehicle = (vehicle) => {
    const id = uid('v_');
    update(d => ({ ...d, vehicles: [...d.vehicles, { ...vehicle, id, createdAt: new Date().toISOString(), status: 'intake' }] }));
    return id;
  };

  const updateVehicle = (id, fields) => {
    update(d => ({ ...d, vehicles: d.vehicles.map(v => v.id === id ? { ...v, ...fields } : v) }));
  };

  const deleteVehicle = (id) => {
    update(d => ({ ...d, vehicles: d.vehicles.filter(v => v.id !== id) }));
  };

  const listVehicle = (id) => {
    update(d => ({ ...d, vehicles: d.vehicles.map(v => v.id === id ? { ...v, status: 'active', listedAt: new Date().toISOString() } : v) }));
  };

  const unlistVehicle = (id) => {
    update(d => ({
      ...d,
      vehicles: d.vehicles.map(v => v.id === id ? { ...v, status: 'ready' } : v),
      bids: d.bids.filter(b => b.vehicleId !== id),
    }));
  };

  // --- Bids ---
  const placeBid = (vehicleId, storeId, storeName, amount) => {
    const existing = data.bids.find(b => b.vehicleId === vehicleId && b.storeId === storeId);
    if (existing) {
      update(d => ({
        ...d,
        bids: d.bids.map(b =>
          b.vehicleId === vehicleId && b.storeId === storeId
            ? { ...b, amount, updatedAt: new Date().toISOString() }
            : b
        )
      }));
    } else {
      update(d => ({
        ...d,
        bids: [...d.bids, {
          id: 'bid_' + Date.now(),
          vehicleId, storeId, storeName, amount,
          placedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }]
      }));
    }
  };

  const getHighBid = (vehicleId) => {
    const vBids = data.bids.filter(b => b.vehicleId === vehicleId);
    if (!vBids.length) return null;
    return Math.max(...vBids.map(b => b.amount));
  };

  const getMyBid = (vehicleId, storeId) => {
    return data.bids.find(b => b.vehicleId === vehicleId && b.storeId === storeId) || null;
  };

  const getAllBidsForVehicle = (vehicleId) => {
    return [...data.bids.filter(b => b.vehicleId === vehicleId)].sort((a, b) => b.amount - a.amount);
  };

  // --- Transport ---
  // Advance the outbound (sold-car) transport record. Scoped to non-repair
  // records so it never disturbs a repair trip that shares the same vehicleId
  // (an awarded car can be both sold and out for repair at once).
  const updateTransport = (vehicleId, stepKey, notes) => {
    update(d => ({
      ...d,
      transport: d.transport.map(t =>
        t.vehicleId === vehicleId && t.kind !== 'repair'
          ? { ...t, status: stepKey, notes: notes || t.notes, steps: { ...t.steps, [stepKey]: new Date().toISOString() } }
          : t
      )
    }));
  };

  // Advance the repair trip (drop-off / pickup / return). Lives in the same
  // transport list as outbound but is tagged kind: 'repair' so the two stay
  // independent.
  const updateRepairTransport = (vehicleId, stepKey, notes) => {
    update(d => ({
      ...d,
      transport: d.transport.map(t =>
        t.vehicleId === vehicleId && t.kind === 'repair'
          ? { ...t, status: stepKey, notes: notes != null ? notes : t.notes, steps: { ...t.steps, [stepKey]: new Date().toISOString() } }
          : t
      )
    }));
  };

  const BADGE_DEFS = [
    { id: 'first_bid', label: 'First Pick', icon: '🎯', desc: 'Placed your first ever bid' },
    { id: 'quick_draw', label: 'Quick Draw', icon: '⚡', desc: 'Bid within 5 min of auction opening' },
    { id: 'top_buyer', label: 'Top Buyer', icon: '👑', desc: 'Most cars won in a single auction' },
    { id: 'sharp_shooter', label: 'Sharp Shooter', icon: '🔫', desc: 'Won a car at exactly the floor price' },
    { id: 'hat_trick', label: 'Hat Trick', icon: '🎩', desc: 'Won 3+ cars in one auction' },
    { id: 'big_spender', label: 'Big Spender', icon: '💰', desc: 'Won a car over $30,000' },
    { id: 'loyal_bidder', label: 'Loyal Bidder', icon: '🤝', desc: 'Placed bids in 3+ auctions' },
    { id: 'clean_sweep', label: 'Clean Sweep', icon: '🧹', desc: 'Won every car you bid on in an auction' },
  ];

  const computeBadges = (storeId) => {
    const d = loadData();
    const myWins = d.vehicles.filter(v => v.status === 'awarded' && v.winnerId === storeId);
    const myBids = d.bids.filter(b => b.storeId === storeId);
    const earned = [];

    if (myBids.length > 0) earned.push('first_bid');
    if (myWins.some(v => v.winningBid >= 30000)) earned.push('big_spender');
    if (myWins.some(v => v.floorPrice && v.winningBid === parseFloat(v.floorPrice))) earned.push('sharp_shooter');

    // Hat trick - check any auction where store won 3+
    const winsByAuction = {};
    myWins.forEach(v => {
      const ah = d.auctionHistory.find(h => h.closedDate && new Date(v.awardedAt) <= new Date(h.closedDate) && new Date(v.awardedAt) >= new Date(h.openDate || 0));
      const key = ah?.id || 'misc';
      winsByAuction[key] = (winsByAuction[key] || 0) + 1;
    });
    if (Object.values(winsByAuction).some(c => c >= 3)) earned.push('hat_trick');

    // Top buyer - won the most in any auction
    const stores = ['SAG', 'KIA', 'CLR', 'MIL', 'MAR'];
    const allWinsByStore = {};
    stores.forEach(s => { allWinsByStore[s] = d.vehicles.filter(v => v.status === 'awarded' && v.winnerId === s).length; });
    const maxWins = Math.max(...Object.values(allWinsByStore));
    if (maxWins > 0 && allWinsByStore[storeId] === maxWins) earned.push('top_buyer');

    // Loyal bidder - participated in 3+ auctions (has bids spread across time)
    const auctionParticipation = new Set(myBids.map(b => {
      const v = d.vehicles.find(vv => vv.id === b.vehicleId);
      return v?.listedAt?.substring(0, 10) || b.placedAt?.substring(0, 10);
    }));
    if (auctionParticipation.size >= 3) earned.push('loyal_bidder');

    // Clean sweep
    const myBidVehicleIds = new Set(myBids.map(b => b.vehicleId));
    const myBidVehicles = d.vehicles.filter(v => myBidVehicleIds.has(v.id) && ['awarded','no_sale'].includes(v.status));
    if (myBidVehicles.length > 0 && myBidVehicles.every(v => v.winnerId === storeId)) earned.push('clean_sweep');

    return earned;
  };

  const checkAndAwardBadges = (storeId, bidAmount) => {
    // Quick draw
    if (data.auction.openDate) {
      const openTime = new Date(data.auction.openDate);
      if ((new Date() - openTime) < 5 * 60 * 1000) {
        update(d => ({ ...d, badges: { ...d.badges, [storeId]: [...new Set([...(d.badges[storeId]||[]), 'quick_draw'])] } }));
      }
    }
    if (data.bids.filter(b => b.storeId === storeId).length === 0) {
      update(d => ({ ...d, badges: { ...d.badges, [storeId]: [...new Set([...(d.badges[storeId]||[]), 'first_bid'])] } }));
    }
  };

  const computePostAuctionBadges = () => {};

  const updateStorePhoto = (storeId, photoData) => {
    update(d => ({ ...d, storePhotos: { ...d.storePhotos, [storeId]: photoData } }));
  };

  const fileArbitration = (vehicleId, storeId, storeName, issueType, details) => {
    update(d => ({
      ...d,
      vehicles: d.vehicles.map(v => v.id === vehicleId ? {
        ...v,
        arbitration: {
          status: 'open',
          storeId, storeName, issueType, details,
          filedAt: new Date().toISOString(),
          resolution: null, resolvedAt: null,
        }
      } : v)
    }));
  };

  const resolveArbitration = (vehicleId, resolution) => {
    update(d => ({
      ...d,
      vehicles: d.vehicles.map(v => v.id === vehicleId ? {
        ...v,
        arbitration: { ...v.arbitration, status: 'resolved', resolution, resolvedAt: new Date().toISOString() }
      } : v)
    }));
  };

  // --- Approved repair vendors ---
  // TRI-STATE keeps the master list of shops it trusts for repair work. Any
  // vehicle, at any stage, can be sent out to one of these (see sendToRepair).
  const addVendor = (vendor) => {
    const id = uid('vn_');
    update(d => ({
      ...d,
      approvedVendors: [...(d.approvedVendors || []), { ...vendor, id, createdAt: new Date().toISOString() }],
    }));
    return id;
  };

  const updateVendor = (id, fields) => {
    update(d => ({
      ...d,
      approvedVendors: (d.approvedVendors || []).map(v => v.id === id ? { ...v, ...fields } : v),
    }));
  };

  const deleteVendor = (id) => {
    update(d => ({
      ...d,
      approvedVendors: (d.approvedVendors || []).filter(v => v.id !== id),
    }));
  };

  // --- Repair ---
  // Send a vehicle out for repair to an approved vendor. This is an overlay on
  // top of the auction stage — it doesn't change v.status — so a car can be in
  // repair whether it's in intake, recon, ready, live, or already awarded.
  //
  // A repair is also a physical trip: the car is dropped off at the shop and
  // picked up when the work is done. So sending one out also opens a repair
  // transport record (kind: 'repair') that surfaces on Transport & Title, where
  // the drop-off and pickup are tracked. Re-sending replaces any prior repair
  // trip for the same vehicle.
  const sendToRepair = (vehicleId, { vendorId, vendorName, reason, details, estCost, notes, poNumber }) => {
    update(d => {
      const v = d.vehicles.find(vv => vv.id === vehicleId);
      const sentAt = new Date().toISOString();

      const vehicles = d.vehicles.map(vv => vv.id === vehicleId ? {
        ...vv,
        repair: {
          status: 'in_repair',
          vendorId: vendorId || null,
          vendorName: vendorName || '',
          reason: reason || '',
          details: details || '',
          poNumber: poNumber || '',
          estCost: estCost || '',
          notes: notes || '',
          sentAt,
          completedAt: null,
          actualCost: '',
        },
      } : vv);

      const vehicleName = v ? `${v.year} ${v.make} ${v.model}` : '';
      const repairTrip = {
        id: 'rp_' + vehicleId,
        kind: 'repair',
        vehicleId,
        vehicleName,
        vendorId: vendorId || null,
        vendorName: vendorName || '',
        status: 'scheduled',
        notes: notes || '',
        steps: { scheduled: sentAt, droppedOff: null, pickedUp: null, returned: null },
      };
      const transport = [
        ...d.transport.filter(t => !(t.kind === 'repair' && t.vehicleId === vehicleId)),
        repairTrip,
      ];

      return { ...d, vehicles, transport };
    });
  };

  // Mark a vehicle's current repair complete (back from the shop).
  const completeRepair = (vehicleId, { actualCost, completionNotes } = {}) => {
    update(d => ({
      ...d,
      vehicles: d.vehicles.map(v => v.id === vehicleId && v.repair ? {
        ...v,
        repair: {
          ...v.repair,
          status: 'completed',
          completedAt: new Date().toISOString(),
          actualCost: actualCost != null ? actualCost : v.repair.actualCost,
          completionNotes: completionNotes || v.repair.completionNotes || '',
        },
      } : v)
    }));
  };

  return (
    <DataContext.Provider value={{
      data,
      setAuction,
      openAuction,
      closeAuction,
      directSale,
      addVehicle,
      updateVehicle,
      deleteVehicle,
      listVehicle,
      unlistVehicle,
      placeBid,
      getHighBid,
      getMyBid,
      getAllBidsForVehicle,
      updateTransport,
      updateRepairTransport,
      fileArbitration,
      resolveArbitration,
      addVendor,
      updateVendor,
      deleteVendor,
      sendToRepair,
      completeRepair,
      updateStorePhoto,
      checkAndAwardBadges,
      computeBadges,
      BADGE_DEFS,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() { return useContext(DataContext); }
