import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

// Shared state lives in a managed Postgres database behind /api/state, not in
// the browser. A fresh database has no row, so every browser starts from this
// blank slate and all activity from that point forward is persisted to the
// shared backend (with an append-only audit trail) for reference and audit.
const API = '/api/state';
const POLL_MS = 5000;

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

const normalize = (raw) => ({ ...DEFAULT_DATA, ...(raw || {}) });

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [data, setData] = useState(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);

  // Refs hold the live values used by the async write pipeline so it always
  // works from the freshest state without re-binding callbacks.
  const dataRef = useRef(DEFAULT_DATA);
  const versionRef = useRef(0);
  const userRef = useRef(user);
  const writeChain = useRef(Promise.resolve());
  const pendingWrites = useRef(0);

  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { userRef.current = user; }, [user]);

  const applyServer = useCallback((payload) => {
    if (!payload) return;
    versionRef.current = payload.version || 0;
    const next = normalize(payload.data);
    dataRef.current = next;
    setData(next);
  }, []);

  // Initial load of the shared state.
  useEffect(() => {
    let cancelled = false;
    fetch(API)
      .then(r => r.json())
      .then(p => { if (!cancelled) applyServer(p); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [applyServer]);

  // Poll so changes made by other browsers (other stores bidding, GM opening
  // an auction, etc.) show up in near real time. Skipped while a local write
  // is in flight to avoid clobbering an optimistic update mid-flight.
  useEffect(() => {
    const iv = setInterval(() => {
      if (pendingWrites.current > 0) return;
      fetch(API)
        .then(r => r.json())
        .then(p => { if (p && (p.version || 0) > versionRef.current) applyServer(p); })
        .catch(() => {});
    }, POLL_MS);
    return () => clearInterval(iv);
  }, [applyServer]);

  // Apply a change locally (optimistically) and persist it to the shared
  // backend. `updater` must be a pure function of previous state so it can be
  // safely re-applied on the latest server state if another writer raced us.
  const update = useCallback((updater, action) => {
    const fn = typeof updater === 'function' ? updater : () => updater;

    const optimistic = fn(dataRef.current);
    dataRef.current = optimistic;
    setData(optimistic);

    pendingWrites.current += 1;
    writeChain.current = writeChain.current.then(async () => {
      try {
        for (let attempt = 0; attempt < 5; attempt++) {
          const res = await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: dataRef.current,
              baseVersion: versionRef.current,
              actor: userRef.current?.id || null,
              action: action || 'update',
            }),
          });

          if (res.ok) {
            const p = await res.json();
            versionRef.current = p.version;
            return;
          }

          if (res.status === 409) {
            // Someone else wrote first. Rebase our change onto their state and
            // retry so no update is silently lost.
            const p = await res.json();
            versionRef.current = p.version || 0;
            const rebased = fn(normalize(p.data));
            dataRef.current = rebased;
            setData(rebased);
            continue;
          }

          return; // Unexpected error: keep the optimistic state, stop retrying.
        }
      } finally {
        pendingWrites.current = Math.max(0, pendingWrites.current - 1);
      }
    });
  }, []);

  // --- Auction ---
  const setAuction = (fields) => update(d => ({ ...d, auction: { ...d.auction, ...fields } }), 'auction:update');

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
    }), 'auction:open');
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
    }, 'auction:close');
  };

  // --- Vehicles ---
  const addVehicle = (vehicle) => {
    const id = 'v_' + Date.now();
    update(d => ({ ...d, vehicles: [...d.vehicles, { ...vehicle, id, createdAt: new Date().toISOString(), status: 'intake' }] }), 'vehicle:add');
    return id;
  };

  const updateVehicle = (id, fields) => {
    update(d => ({ ...d, vehicles: d.vehicles.map(v => v.id === id ? { ...v, ...fields } : v) }), 'vehicle:update');
  };

  const deleteVehicle = (id) => {
    update(d => ({ ...d, vehicles: d.vehicles.filter(v => v.id !== id) }), 'vehicle:delete');
  };

  const listVehicle = (id) => {
    update(d => ({ ...d, vehicles: d.vehicles.map(v => v.id === id ? { ...v, status: 'active', listedAt: new Date().toISOString() } : v) }), 'vehicle:list');
  };

  const unlistVehicle = (id) => {
    update(d => ({
      ...d,
      vehicles: d.vehicles.map(v => v.id === id ? { ...v, status: 'ready' } : v),
      bids: d.bids.filter(b => b.vehicleId !== id),
    }), 'vehicle:unlist');
  };

  // --- Bids ---
  const placeBid = (vehicleId, storeId, storeName, amount) => {
    // The existence check runs inside the updater so the write stays correct
    // even when rebased onto another store's concurrent bid.
    update(d => {
      const existing = d.bids.find(b => b.vehicleId === vehicleId && b.storeId === storeId);
      if (existing) {
        return {
          ...d,
          bids: d.bids.map(b =>
            b.vehicleId === vehicleId && b.storeId === storeId
              ? { ...b, amount, updatedAt: new Date().toISOString() }
              : b
          )
        };
      }
      return {
        ...d,
        bids: [...d.bids, {
          id: 'bid_' + Date.now(),
          vehicleId, storeId, storeName, amount,
          placedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }]
      };
    }, 'bid:place');
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
    }), 'transport:update');
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
    const d = dataRef.current;
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
        update(d => ({ ...d, badges: { ...d.badges, [storeId]: [...new Set([...(d.badges[storeId]||[]), 'quick_draw'])] } }), 'badge:quick_draw');
      }
    }
    if (data.bids.filter(b => b.storeId === storeId).length === 0) {
      update(d => ({ ...d, badges: { ...d.badges, [storeId]: [...new Set([...(d.badges[storeId]||[]), 'first_bid'])] } }), 'badge:first_bid');
    }
  };

  const updateStorePhoto = (storeId, photoData) => {
    update(d => ({ ...d, storePhotos: { ...d.storePhotos, [storeId]: photoData } }), 'store:photo');
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
    }), 'arbitration:file');
  };

  const resolveArbitration = (vehicleId, resolution) => {
    update(d => ({
      ...d,
      vehicles: d.vehicles.map(v => v.id === vehicleId ? {
        ...v,
        arbitration: { ...v.arbitration, status: 'resolved', resolution, resolvedAt: new Date().toISOString() }
      } : v)
    }), 'arbitration:resolve');
  };

  // --- Outside (external) auctions ---
  // Inventory sometimes goes to an outside auction (Manheim, ADESA, etc.) rather
  // than to one of our stores, to chase a higher price or simply to move it. We
  // track the consignment (which auction, asking price, run date), the outcome
  // (sold + sale price, or no-sale) and — when it doesn't sell — the logistics
  // of getting it back into our inventory. A vehicle can be consigned more than
  // once, so each completed attempt is archived in `outsideAuctionHistory`.

  const sendToOutsideAuction = (vehicleId, details) => {
    update(d => ({
      ...d,
      vehicles: d.vehicles.map(v => v.id === vehicleId ? {
        ...v,
        status: 'at_outside_auction',
        currentLocation: 'In Transit',
        outsideAuction: {
          venue: details.venue || '',
          location: details.location || '',
          lotNumber: details.lotNumber || '',
          listingPrice: details.listingPrice || '',
          reservePrice: details.reservePrice || '',
          runDate: details.runDate || '',
          notes: details.notes || '',
          sentAt: new Date().toISOString(),
          outcome: null,
          soldPrice: null,
          fees: null,
          buyer: '',
          soldAt: null,
          return: null,
        },
      } : v)
    }), 'outside:send');
  };

  const updateOutsideListing = (vehicleId, fields) => {
    update(d => ({
      ...d,
      vehicles: d.vehicles.map(v => v.id === vehicleId && v.outsideAuction ? {
        ...v, outsideAuction: { ...v.outsideAuction, ...fields }
      } : v)
    }), 'outside:update');
  };

  const recordOutsideSale = (vehicleId, fields) => {
    update(d => ({
      ...d,
      vehicles: d.vehicles.map(v => v.id === vehicleId && v.outsideAuction ? {
        ...v,
        status: 'sold_outside',
        currentLocation: 'Sold',
        outsideAuction: {
          ...v.outsideAuction,
          outcome: 'sold',
          soldPrice: fields.soldPrice || '',
          fees: fields.fees || '',
          buyer: fields.buyer || '',
          notes: fields.notes != null ? fields.notes : v.outsideAuction.notes,
          soldAt: new Date().toISOString(),
          return: null,
        },
      } : v)
    }), 'outside:sold');
  };

  const markOutsideNoSale = (vehicleId, fields) => {
    update(d => ({
      ...d,
      vehicles: d.vehicles.map(v => v.id === vehicleId && v.outsideAuction ? {
        ...v,
        outsideAuction: {
          ...v.outsideAuction,
          outcome: 'not_sold',
          notes: fields?.notes != null ? fields.notes : v.outsideAuction.notes,
          return: v.outsideAuction.return || {
            status: 'pending',
            carrier: '',
            cost: '',
            notes: '',
            steps: { pending: new Date().toISOString(), dispatched: null, inTransit: null, received: null },
          },
        },
      } : v)
    }), 'outside:nosale');
  };

  const updateOutsideReturn = (vehicleId, stepKey, fields) => {
    update(d => ({
      ...d,
      vehicles: d.vehicles.map(v => {
        if (v.id !== vehicleId || !v.outsideAuction) return v;
        const ret = v.outsideAuction.return || {
          status: 'pending', carrier: '', cost: '', notes: '',
          steps: { pending: null, dispatched: null, inTransit: null, received: null },
        };
        return {
          ...v,
          outsideAuction: {
            ...v.outsideAuction,
            return: {
              ...ret,
              ...(fields || {}),
              status: stepKey || ret.status,
              steps: stepKey
                ? { ...ret.steps, [stepKey]: ret.steps[stepKey] || new Date().toISOString() }
                : ret.steps,
            },
          },
        };
      })
    }), 'outside:return');
  };

  // Finalize a no-sale: the car is physically back, so it re-enters inventory as
  // ready-to-list and the consignment attempt is archived for audit.
  const completeOutsideReturn = (vehicleId) => {
    update(d => ({
      ...d,
      vehicles: d.vehicles.map(v => {
        if (v.id !== vehicleId || !v.outsideAuction) return v;
        const ret = v.outsideAuction.return || {
          status: 'received', carrier: '', cost: '', notes: '', steps: {},
        };
        const completed = {
          ...v.outsideAuction,
          return: {
            ...ret,
            status: 'received',
            steps: { ...ret.steps, received: ret.steps?.received || new Date().toISOString() },
          },
          returnedAt: new Date().toISOString(),
        };
        return {
          ...v,
          status: 'ready',
          currentLocation: 'Arbor Plaza',
          outsideAuction: null,
          outsideAuctionHistory: [...(v.outsideAuctionHistory || []), completed],
        };
      })
    }), 'outside:returned');
  };

  return (
    <DataContext.Provider value={{
      data,
      loaded,
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
      sendToOutsideAuction,
      updateOutsideListing,
      recordOutsideSale,
      markOutsideNoSale,
      updateOutsideReturn,
      completeOutsideReturn,
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
