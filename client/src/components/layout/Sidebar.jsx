import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  Network,
  Share2,
  AlertTriangle,
  History,
  BarChart3,
  ShieldAlert,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { name: 'Overview', path: '/', icon: LayoutDashboard },
  { name: 'Jobs', path: '/jobs', icon: Server },
  { name: 'Workflows', path: '/workflows', icon: Network },
  { name: 'Dependency Explorer', path: '/dependencies', icon: Share2 },
  { name: 'Alerts', path: '/alerts', icon: AlertTriangle },
  { name: 'Execution History', path: '/history', icon: History },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Audit Logs', path: '/audit-logs', icon: ShieldAlert, adminOnly: true },
  { name: 'User Management', path: '/users', icon: Users, adminOnly: true },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar = ({ collapsed, setCollapsed }) => {
  const { user } = useAuth();

  return (
    <aside
      className={`bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col z-20 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded bg-teal-600 flex items-center justify-center font-bold text-white tracking-wider">
              EB
            </div>
            <span className="font-semibold text-sm text-slate-100 tracking-tight leading-tight">
              Enterprise Batch
            </span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded bg-teal-600 flex items-center justify-center font-bold text-white mx-auto">
            EB
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ${collapsed ? 'hidden' : 'block'}`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 py-4 overflow-y-auto space-y-1 px-2">
        {NAV_ITEMS.map((item) => {
          if (item.adminOnly && user?.role !== 'admin') return null;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                }`
              }
              title={collapsed ? item.name : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          );
        })}
      </div>

      <div className="p-3 border-t border-slate-800">
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full flex justify-center p-2 rounded text-slate-400 hover:text-white hover:bg-slate-800"
            title="Expand sidebar"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <div className="text-xs text-slate-500 text-center">
            v1.0.0 Enterprise SaaS
          </div>
        )}
      </div>
    </aside>
  );
};
