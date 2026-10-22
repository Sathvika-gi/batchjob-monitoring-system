import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import api from '../../services/api';

export const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const [dbWarning, setDbWarning] = useState('');

  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshKey(Date.now());
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshKey(Date.now());
    }, 30000); // 30s background poll
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await api.get('/health');
        if (!res.data?.success || res.data?.data?.database !== 'connected') {
          setDbWarning('MongoDB is not connected. Dashboard data cannot be loaded.');
          return;
        }
        setDbWarning('');
      } catch {
        setDbWarning('Cannot reach the API or MongoDB. Confirm the backend is running and the database is connected.');
      }
    };
    checkHealth();
  }, [refreshKey]);

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-[#0F172A] overflow-hidden">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onRefresh={handleRefresh} refreshing={refreshing} lastRefreshed={refreshKey} />
        {dbWarning && (
          <div className="mx-6 mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {dbWarning}
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet context={{ refreshKey, triggerRefresh: handleRefresh }} />
        </main>
      </div>
    </div>
  );
};
