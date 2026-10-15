import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { StatusBadge } from '../common/Badges';
import { AlertTriangle, Clock } from 'lucide-react';

export const JobNode = memo(({ data }) => {
  const isFailed = data.status === 'failed' || data.status === 'timed_out';
  const isBlocked = data.status === 'blocked';
  const isRunning = data.status === 'running';

  return (
    <div
      className={`px-4 py-3 shadow-md rounded-lg bg-white border-2 transition-all w-52 ${
        isFailed
          ? 'border-rose-500 ring-2 ring-rose-200'
          : isBlocked
          ? 'border-amber-400 bg-amber-50/20'
          : isRunning
          ? 'border-blue-500 animate-pulse'
          : 'border-slate-200 hover:border-teal-600'
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-slate-400" />
      
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <div className="font-semibold text-xs text-slate-900 truncate" title={data.label}>
          {data.label}
        </div>
        {data.riskLevel === 'critical' && (
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" title="Critical Risk" />
        )}
      </div>

      <div className="text-[10px] text-slate-400 font-mono mb-2 truncate">
        {data.jobKey}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
        <StatusBadge status={data.status} />
        {data.lastDurationMs && (
          <span className="text-slate-400 flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            {Math.round(data.lastDurationMs / 1000)}s
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-slate-400" />
    </div>
  );
});
