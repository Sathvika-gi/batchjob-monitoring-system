import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../services/api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';

export const AnalyticsPage = () => {
  const { refreshKey } = useOutletContext();
  const [range, setRange] = useState('30d');
  const [overview, setOverview] = useState(null);
  const [durations, setDurations] = useState([]);
  const [failures, setFailures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [ovRes, durRes, failRes] = await Promise.all([
          api.get(`/analytics/executions?range=${range}`),
          api.get(`/analytics/durations?range=${range}`),
          api.get(`/analytics/failures?range=${range}`),
        ]);
        setOverview(ovRes.data.data);
        setDurations(durRes.data.data);
        setFailures(failRes.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [refreshKey, range]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Historical Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">
            Execution reliability trends, duration baselines, and recurring failure hotspots.
          </p>
        </div>

        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="text-xs border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-700 shadow-xs"
        >
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold uppercase text-slate-500">Overall Success Rate</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{overview?.successRate || 0}%</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold uppercase text-slate-500">Failure Rate</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">{overview?.failureRate || 0}%</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold uppercase text-slate-500">Total Recorded Runs</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{overview?.totalExecutions || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold uppercase text-slate-500">Average Duration</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {overview?.avgDurationMs ? `${Math.round(overview.avgDurationMs / 1000)}s` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Failing Jobs */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">
            Most Frequently Failing Jobs
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview?.topFailingJobs || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="jobKey" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip />
                <Bar dataKey="failureCount" fill="#EF4444" name="Failures" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Duration Baselines by Job */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">
            Duration Baselines: Average vs Median (s)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={durations.slice(0, 6).map((d) => ({
                  job: d.jobKey,
                  avgSec: Math.round((d.stats?.avg || 0) / 1000),
                  medianSec: Math.round((d.stats?.median || 0) / 1000),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="job" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="avgSec" fill="#0F766E" name="Average (s)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="medianSec" fill="#64748B" name="Median (s)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
