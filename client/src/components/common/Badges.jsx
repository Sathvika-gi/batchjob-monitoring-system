import React from 'react';

export const STATUS_COLORS = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  running: 'bg-blue-50 text-blue-700 border-blue-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
  timed_out: 'bg-rose-50 text-rose-700 border-rose-200',
  blocked: 'bg-amber-50 text-amber-700 border-amber-200',
  pending: 'bg-slate-50 text-slate-700 border-slate-200',
  queued: 'bg-purple-50 text-purple-700 border-purple-200',
  cancelled: 'bg-gray-100 text-gray-700 border-gray-300',
  healthy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  at_risk: 'bg-amber-50 text-amber-700 border-amber-200',
  impacted: 'bg-orange-50 text-orange-700 border-orange-200',
  disabled: 'bg-gray-100 text-gray-500 border-gray-200',
};

export const StatusBadge = ({ status }) => {
  const normalized = (status || 'pending').toLowerCase();
  const colorClass = STATUS_COLORS[normalized] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border uppercase tracking-wider ${colorClass}`}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-75"></span>
      {status ? status.replace('_', ' ') : 'UNKNOWN'}
    </span>
  );
};

export const SeverityBadge = ({ severity }) => {
  const sev = (severity || 'low').toLowerCase();
  const colors = {
    critical: 'bg-rose-100 text-rose-800 border-rose-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    medium: 'bg-amber-100 text-amber-800 border-amber-300',
    low: 'bg-slate-100 text-slate-700 border-slate-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border uppercase tracking-wider ${colors[sev] || colors.low}`}>
      {severity}
    </span>
  );
};
