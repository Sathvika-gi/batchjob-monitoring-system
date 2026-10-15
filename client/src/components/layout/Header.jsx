import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, RefreshCw, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Header = ({ onRefresh, refreshing, lastRefreshed }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [env, setEnv] = useState('Production');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10 sticky top-0 shadow-xs">
      <div className="flex items-center gap-4 flex-1 max-w-lg">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Global search jobs, workflows, executions..."
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <select
          value={env}
          onChange={(e) => setEnv(e.target.value)}
          className="text-xs bg-slate-100 border border-slate-200 text-slate-700 font-medium py-1 px-2 rounded cursor-pointer focus:outline-none"
        >
          <option value="Production">ENV: Production</option>
          <option value="Staging">ENV: Staging</option>
          <option value="Development">ENV: Development</option>
        </select>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        )}

        {lastRefreshed && (
          <span className="text-xs text-slate-400 hidden md:inline">
            Updated {new Date(lastRefreshed).toLocaleTimeString()}
          </span>
        )}

        <button
          onClick={() => navigate('/alerts')}
          className="relative p-1.5 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors"
          title="Alerts"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
        </button>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-md hover:bg-slate-100 text-slate-700 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-teal-100 border border-teal-300 flex items-center justify-center text-teal-800 font-semibold text-xs uppercase">
              {user?.name ? user.name.slice(0, 2) : 'US'}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-medium leading-none">{user?.name}</div>
              <div className="text-[10px] text-slate-400 uppercase mt-0.5">{user?.role}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-30">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-medium text-slate-900">{user?.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/settings');
                }}
                className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <User className="w-3.5 h-3.5" />
                Profile & Settings
              </button>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
