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
  const updateTransport = (vehicleId, stepKey, notes) => {
    update(d => ({
      ...d,
      transport: d.transport.map(t =>
        t.vehicleId === vehicleId
          ? { ...t, status: stepKey, notes: notes || t.notes, steps: { ...t.steps, [stepKey]: new Date().toISOString() } }
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

  return (
    <DataContext.Provider value={{
      data,
      setAuction,
      openAuction,
      closeAuction,
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
      fileArbitration,
      resolveArbitration,
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
