import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { SeverityBadge } from '../components/common/Badges';
import { useAuth } from '../context/AuthContext';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  RotateCcw,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const AlertsPage = () => {
  const { refreshKey, triggerRefresh } = useOutletContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('open');
  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const isOperatorOrAdmin = user?.role === 'admin' || user?.role === 'operator';

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        ...(statusFilter && { status: statusFilter }),
        ...(severityFilter && { severity: severityFilter }),
        ...(typeFilter && { type: typeFilter }),
        limit: 50,
      });
      const res = await api.get(`/alerts?${query.toString()}`);
      setAlerts(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [refreshKey, statusFilter, severityFilter, typeFilter]);

  const handleAcknowledge = async (id) => {
    try {
      await api.post(`/alerts/${id}/acknowledge`);
      triggerRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Error acknowledging alert');
    }
  };

  const handleResolve = async (id) => {
    try {
      await api.post(`/alerts/${id}/resolve`);
      triggerRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Error resolving alert');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Alerts & Predictive Anomalies</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review critical batch failures, dependency breaks, and explainable predictive delay detections.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Selectors */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded">
          {['open', 'acknowledged', 'resolved', ''].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-semibold rounded capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {st || 'All'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 text-slate-700"
          >
            <option value="">Severity: All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 text-slate-700"
          >
            <option value="">Type: All</option>
            <option value="job_failure">Job Failure</option>
            <option value="predicted_delay">Predicted Delay</option>
            <option value="execution_timeout">Execution Timeout</option>
            <option value="duration_anomaly">Duration Anomaly</option>
            <option value="dependency_failure">Dependency Failure</option>
          </select>
        </div>
      </div>

      {/* Alerts Stream */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-xs text-slate-400">
            Loading alerts...
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-xs text-slate-400">
            No alerts matching current filters.
          </div>
        ) : (
          alerts.map((al) => (
            <div
              key={al._id}
              className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={al.severity} />
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">
                    {al.type.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(al.createdAt).toLocaleString()}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm">{al.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">{al.description}</p>

                {/* Evidence Metadata for Explainable Predictions */}
                {al.evidence && (
                  <div className="mt-2 p-2.5 bg-slate-50 border border-slate-100 rounded text-[11px] text-slate-600 space-y-1">
                    <span className="font-semibold text-slate-700 block">Baseline Statistical Evidence:</span>
                    <div className="flex flex-wrap gap-4 text-[10px]">
                      <span>Sample Size: <strong>{al.evidence.sampleCount} runs</strong></span>
                      <span>Median Baseline: <strong>{Math.round((al.evidence.baselineMedianMs || 0) / 1000)}s</strong></span>
                      <span>Recent Average: <strong>{Math.round((al.evidence.recentAvgMs || 0) / 1000)}s</strong></span>
                      <span>Recent Failure Rate: <strong>{(al.evidence.recentFailureRate * 100).toFixed(0)}%</strong></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {al.jobId && (
                  <Link
                    to={`/jobs/${al.jobId._id}`}
                    className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 text-slate-600 text-xs flex items-center gap-1"
                    title="Inspect Job"
                  >
                    <span>Job</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}

                {isOperatorOrAdmin && al.status === 'open' && (
                  <button
                    onClick={() => handleAcknowledge(al._id)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium"
                  >
                    Acknowledge
                  </button>
                )}

                {isOperatorOrAdmin && al.status !== 'resolved' && (
                  <button
                    onClick={() => handleResolve(al._id)}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-medium flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Resolve</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
