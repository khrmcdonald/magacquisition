import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DataContext = createContext(null);

const STORAGE_KEY = 'mag_data';

const DEFAULT_DATA = {
  auction: {
    isOpen: false,
    openDate: null,
    closeDate: null,
    label: 'Week of ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  },
  vehicles: [],
  bids: [],
  transport: [],
  auctionHistory: [],
};

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_DATA, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_DATA;
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function DataProvider({ children }) {
  const [data, setData] = useState(loadData);

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
    const id = 'v_' + Date.now();
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
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() { return useContext(DataContext); }
