import React, { useEffect, useState } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import api, { getApiErrorMessage } from '../services/api';
import { StatusBadge, SeverityBadge } from '../components/common/Badges';
import {
  Server,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const OverviewPage = () => {
  const { refreshKey } = useOutletContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [timeRange, setTimeRange] = useState('24h');
  const [workflows, setWorkflows] = useState([]);
  const [criticalAlerts, setCriticalAlerts] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const [overviewRes, trendRes, wfRes, alertRes] = await Promise.all([
          api.get(`/analytics/overview?range=${timeRange}`),
          api.get(`/analytics/executions/trend?range=${timeRange}`),
          api.get('/workflows?limit=5'),
          api.get('/alerts?status=open&limit=5'),
        ]);

        setStats(overviewRes.data.data);
        setTrendData(trendRes.data.data);
        setWorkflows(wfRes.data.data);
        setCriticalAlerts(alertRes.data.data);
      } catch (err) {
        setStats(null);
        setTrendData([]);
        setWorkflows([]);
        setCriticalAlerts([]);
        setLoadError(getApiErrorMessage(err, 'Failed to load dashboard data from MongoDB.'));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [refreshKey, timeRange]);

  const summary = stats?.summary || {
    totalJobs: 0,
    successfulJobs: 0,
    successfulExecutions: 0,
    failedJobs: 0,
    runningJobs: 0,
    pendingJobs: 0,
    blockedJobs: 0,
    atRiskJobs: 0,
  };

  const metricCards = [
    { title: 'Total Jobs', value: summary.totalJobs, icon: Server, color: 'text-slate-700', bg: 'bg-slate-50', subtitle: 'Configured jobs', link: '/jobs' },
    { title: 'Successful Jobs', value: summary.successfulJobs, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', subtitle: 'Latest state success', link: '/jobs?status=success' },
    { title: 'Successful Executions', value: summary.successfulExecutions, icon: TrendingUp, color: 'text-teal-700', bg: 'bg-teal-50', subtitle: `Past ${timeRange} history`, link: '/executions?status=success' },
    { title: 'Failed Jobs', value: summary.failedJobs, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50', subtitle: 'Failed or timed out', link: '/jobs?status=failed' },
    { title: 'Running Jobs', value: summary.runningJobs, icon: PlayCircle, color: 'text-blue-600', bg: 'bg-blue-50', subtitle: 'Active execution', link: '/jobs?status=running' },
    { title: 'At-Risk Jobs', value: summary.atRiskJobs, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', subtitle: 'SLA delay risk', link: '/jobs?riskLevel=at_risk' },
  ];

  const distributionData = [
    { name: 'Success', value: summary.successfulJobs, color: '#10B981' },
    { name: 'Failed', value: summary.failedJobs, color: '#EF4444' },
    { name: 'Running', value: summary.runningJobs, color: '#3B82F6' },
    { name: 'Blocked', value: summary.blockedJobs || 0, color: '#F59E0B' },
    { name: 'Pending', value: summary.pendingJobs || 0, color: '#64748B' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Operations Overview</h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor batch execution, workflow health, and upcoming operational risks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="text-xs font-medium border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-700 shadow-xs focus:ring-teal-600 focus:border-teal-600"
          >
            <option value="24h">Range: Last 24 Hours</option>
            <option value="7d">Range: Last 7 Days</option>
            <option value="30d">Range: Last 30 Days</option>
          </select>
        </div>
      </div>

      {loadError && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {loadError}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metricCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => card.link && navigate(card.link)}
              className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate" title={card.title}>
                  {card.title}
                </span>
                <div className={`p-1.5 rounded ${card.bg} ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl font-bold text-slate-900">{card.value}</span>
                {card.subtitle && (
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">{card.subtitle}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Execution Trend (7 Days)</h3>
            <span className="text-xs text-slate-400">Daily batches</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="success" stroke="#10B981" strokeWidth={2} name="Success" />
                <Line type="monotone" dataKey="failed" stroke="#EF4444" strokeWidth={2} name="Failed" />
                <Line type="monotone" dataKey="running" stroke="#3B82F6" strokeWidth={2} name="Running" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Job Status Distribution</h3>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 text-xs">
            {distributionData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                <span className="text-slate-600 truncate">{d.name}:</span>
                <span className="font-semibold text-slate-900">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Column Operational Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workflow Health */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Workflow Health Overview</h3>
            <Link to="/workflows" className="text-xs text-teal-700 hover:text-teal-800 flex items-center gap-1 font-medium">
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {workflows.map((wf) => (
              <div
                key={wf._id}
                onClick={() => navigate(`/workflows/${wf._id}`)}
                className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="font-medium text-sm text-slate-900">{wf.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{wf.healthReason || 'Operational'}</div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={wf.health} />
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Active Open Alerts</h3>
            <Link to="/alerts" className="text-xs text-teal-700 hover:text-teal-800 flex items-center gap-1 font-medium">
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {criticalAlerts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No open alerts requiring attention.</div>
            ) : (
              criticalAlerts.map((al) => (
                <div
                  key={al._id}
                  onClick={() => navigate(`/alerts`)}
                  className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div className="pr-4">
                    <div className="font-medium text-sm text-slate-900 truncate">{al.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{al.description}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <SeverityBadge severity={al.severity} />
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Recent Executions</h3>
          <Link to="/history" className="text-xs text-teal-700 hover:text-teal-800 flex items-center gap-1 font-medium">
            Full Execution History <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Job Name</th>
                <th className="px-4 py-3">Workflow</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Started At</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Trigger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(stats?.recentExecutions || []).map((ex) => (
                <tr key={ex._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{ex.jobId?.name || 'N/A'}</td>
                  <td className="px-4 py-3">{ex.workflowId?.name || 'N/A'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={ex.status} />
                  </td>
                  <td className="px-4 py-3">{new Date(ex.startedAt || ex.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">{ex.durationMs ? `${Math.round(ex.durationMs / 1000)}s` : '-'}</td>
                  <td className="px-4 py-3 capitalize">{ex.triggerType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
