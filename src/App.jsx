import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import './index.css';

import Login from './pages/Login';
import Layout from './components/Layout';
import AuctionFloor from './pages/AuctionFloor';
import Acquisitions from './pages/Acquisitions';
import AuctionManage from './pages/AuctionManage';
import Transport from './pages/Transport';
import GMOverview from './pages/GMOverview';
import MyWins from './pages/MyWins';
import Admin from './pages/Admin';
import History from './pages/History';
import Dashboard from './pages/Dashboard';

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

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
              <Route index element={<HomeRedirect />} />
              <Route path="auction" element={<AuctionFloor />} />
              <Route path="acquisitions" element={<Acquisitions />} />
              <Route path="manage" element={<AuctionManage />} />
              <Route path="transport" element={<Transport />} />
              <Route path="overview" element={<GMOverview />} />
              <Route path="wins" element={<MyWins />} />
              <Route path="admin" element={<Admin />} />
              <Route path="history" element={<History />} />
              <Route path="dashboard" element={<Dashboard />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}
