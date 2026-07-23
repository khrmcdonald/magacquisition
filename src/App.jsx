import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './components/Toast';
import './index.css';

import Login from './pages/Login';
import Register from './pages/Register';
import Layout from './components/Layout';
import AuctionFloor from './pages/AuctionFloor';
import Acquisitions from './pages/Acquisitions';
import AuctionManage from './pages/AuctionManage';
import Transport from './pages/Transport';
import Repairs from './pages/Repairs';
import GMOverview from './pages/GMOverview';
import MyWins from './pages/MyWins';
import Admin from './pages/Admin';
import History from './pages/History';
import Dashboard from './pages/Dashboard';
import Leaderboard from './pages/Leaderboard';
import Export from './pages/Export';
import Inventory from './pages/Inventory';
import Help from './pages/Help';
import Titles from './pages/Titles';
import Sold from './pages/Sold';
import Preview from './pages/Preview';
import BulkEdit from './pages/BulkEdit';

function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to="/dashboard" replace />;
}

// All authenticated pages — wrapped in DataProvider so loading/error state
// only blocks the app, not the public /preview route.
function AuthenticatedApp() {
  return (
    <DataProvider>
      <Routes>
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<HomeRedirect />} />
          <Route path="auction" element={<AuctionFloor />} />
          <Route path="acquisitions" element={<Acquisitions />} />
          <Route path="manage" element={<AuctionManage />} />
          <Route path="transport" element={<Transport />} />
          <Route path="titles" element={<Titles />} />
          <Route path="repairs" element={<Repairs />} />
          <Route path="overview" element={<GMOverview />} />
          <Route path="wins" element={<MyWins />} />
          <Route path="admin" element={<Admin />} />
          <Route path="history" element={<History />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="export" element={<Export />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="help" element={<Help />} />
          <Route path="sold" element={<Sold />} />
          <Route path="bulk-edit" element={<BulkEdit />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DataProvider>
  );
}

export default function App() {
  // Public page — bypass auth and data loading entirely
  if (window.location.pathname === '/preview') {
    return <Preview />;
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/*" element={<AuthenticatedApp />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
