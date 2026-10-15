import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge, SeverityBadge } from '../components/common/Badges';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Play,
  RotateCcw,
  Clock,
  Layers,
  AlertTriangle,
  FileText,
  Activity,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export const JobDetailsPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [executions, setExecutions] = useState([]);
  const [dependencies, setDependencies] = useState({ upstream: [], downstream: [] });
  const [impact, setImpact] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);

  const isOperatorOrAdmin = user?.role === 'admin' || user?.role === 'operator';

  useEffect(() => {
    const fetchJobData = async () => {
      setLoading(true);
      try {
        const [jobRes, execRes, depRes, perfRes] = await Promise.all([
          api.get(`/jobs/${id}`),
          api.get(`/jobs/${id}/executions?limit=10`),
          api.get(`/jobs/${id}/dependencies`),
          api.get(`/jobs/${id}/performance`),
        ]);
        setJob(jobRes.data.data);
        setExecutions(execRes.data.data);
        setDependencies(depRes.data.data);
        setPerformance(perfRes.data.data);

        // Fetch impact if job failed or blocked
        if (jobRes.data.data.status === 'failed' || jobRes.data.data.status === 'blocked') {
          const impactRes = await api.get(`/jobs/${id}/impact`);
          setImpact(impactRes.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchJobData();
  }, [id]);

  const handleRunDemo = async () => {
    try {
      await api.post(`/jobs/${id}/run`);
      alert('Execution queued!');
      const execRes = await api.get(`/jobs/${id}/executions?limit=10`);
      setExecutions(execRes.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to queue job');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading job details...</div>;
  }

  if (!job) {
    return <div className="p-8 text-center text-xs text-rose-500">Job not found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Header Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <Link to="/jobs" className="inline-flex items-center gap-1 text-xs text-teal-700 hover:text-teal-800 font-medium mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Jobs
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{job.name}</h1>
            <StatusBadge status={job.status} />
            <SeverityBadge severity={job.criticality} />
          </div>
          <p className="text-xs font-mono text-slate-400 mt-0.5">KEY: {job.jobKey} | WORKFLOW: {job.workflowId?.name}</p>
        </div>

        {isOperatorOrAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded text-xs transition-colors shadow-xs"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Trigger Manual Run</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs Bar */}
      <div className="border-b border-slate-200 flex gap-6 text-xs font-medium">
        {[
          { key: 'overview', label: 'Overview', icon: FileText },
          { key: 'executions', label: 'Executions', icon: Clock },
          { key: 'dependencies', label: 'Dependencies', icon: Layers },
          { key: 'performance', label: 'Performance', icon: Activity },
          { key: 'configuration', label: 'Configuration', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-teal-700 text-teal-800 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Job Description</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                {job.description || 'No detailed operational description provided.'}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs">
                <div>
                  <div className="text-slate-400">Schedule</div>
                  <div className="font-mono font-medium text-slate-800 mt-0.5">{job.schedule || 'Manual'}</div>
                </div>
                <div>
                  <div className="text-slate-400">Expected Duration</div>
                  <div className="font-medium text-slate-800 mt-0.5">{Math.round(job.expectedDurationMs / 1000)}s</div>
                </div>
                <div>
                  <div className="text-slate-400">Timeout Threshold</div>
                  <div className="font-medium text-slate-800 mt-0.5">{Math.round(job.timeoutMs / 60000)}m</div>
                </div>
                <div>
                  <div className="text-slate-400">Max Retries</div>
                  <div className="font-medium text-slate-800 mt-0.5">{job.retryLimit} attempts</div>
                </div>
              </div>
            </div>

            {impact && (
              <div className="bg-rose-50 border border-rose-200 p-5 rounded-lg text-xs space-y-2">
                <div className="flex items-center gap-2 text-rose-800 font-semibold text-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Downstream Failure Impact Detected</span>
                </div>
                <p className="text-rose-700">{impact.summary}</p>
                <div className="pt-2 flex gap-4 text-rose-900 font-medium">
                  <div>Directly Impacted: {impact.directlyImpacted?.length || 0}</div>
                  <div>Transitively Impacted: {impact.transitivelyImpacted?.length || 0}</div>
                  <div>Critical At-Risk: {impact.criticalAffected || 0}</div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3 text-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Upstream Readiness</h3>
              {dependencies.upstream.length === 0 ? (
                <p className="text-slate-400">Root node (No upstream dependencies).</p>
              ) : (
                <div className="space-y-2">
                  {dependencies.upstream.map((dep) => (
                    <div key={dep._id} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="font-medium text-slate-700">{dep.upstreamJobId?.name}</span>
                      <StatusBadge status={dep.upstreamJobId?.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3 text-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Downstream Dependents</h3>
              {dependencies.downstream.length === 0 ? (
                <p className="text-slate-400">Leaf node (No downstream dependents).</p>
              ) : (
                <div className="space-y-2">
                  {dependencies.downstream.map((dep) => (
                    <div key={dep._id} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="font-medium text-slate-700">{dep.downstreamJobId?.name}</span>
                      <StatusBadge status={dep.downstreamJobId?.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'executions' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Execution ID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Attempt</th>
                  <th className="px-4 py-3">Trigger</th>
                  <th className="px-4 py-3">Error Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {executions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-6 text-center text-slate-400">No execution records found.</td>
                  </tr>
                ) : (
                  executions.map((ex) => (
                    <tr key={ex._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-800">{ex._id}</td>
                      <td className="px-4 py-3"><StatusBadge status={ex.status} /></td>
                      <td className="px-4 py-3">{new Date(ex.startedAt || ex.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3">{ex.durationMs ? `${Math.round(ex.durationMs / 1000)}s` : '-'}</td>
                      <td className="px-4 py-3">#{ex.attemptNumber}</td>
                      <td className="px-4 py-3 capitalize">{ex.triggerType}</td>
                      <td className="px-4 py-3 text-rose-600 truncate max-w-xs">{ex.errorMessage || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'dependencies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Upstream Prerequisites</h3>
            <div className="space-y-2">
              {dependencies.upstream.map((dep) => (
                <div key={dep._id} className="p-3 bg-slate-50 border border-slate-100 rounded flex justify-between items-center text-xs">
                  <div>
                    <div className="font-semibold text-slate-800">{dep.upstreamJobId?.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{dep.upstreamJobId?.jobKey}</div>
                  </div>
                  <StatusBadge status={dep.upstreamJobId?.status} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Downstream Direct Dependents</h3>
            <div className="space-y-2">
              {dependencies.downstream.map((dep) => (
                <div key={dep._id} className="p-3 bg-slate-50 border border-slate-100 rounded flex justify-between items-center text-xs">
                  <div>
                    <div className="font-semibold text-slate-800">{dep.downstreamJobId?.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{dep.downstreamJobId?.jobKey}</div>
                  </div>
                  <StatusBadge status={dep.downstreamJobId?.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[10px] font-semibold uppercase text-slate-500">Average Duration</span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {performance?.stats?.avg ? `${Math.round(performance.stats.avg / 1000)}s` : 'N/A'}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[10px] font-semibold uppercase text-slate-500">Median Duration</span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {performance?.stats?.median ? `${Math.round(performance.stats.median / 1000)}s` : 'N/A'}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[10px] font-semibold uppercase text-slate-500">P95 Duration</span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {performance?.stats?.p95 ? `${Math.round(performance.stats.p95 / 1000)}s` : 'N/A'}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[10px] font-semibold uppercase text-slate-500">Samples Recorded</span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {performance?.stats?.sampleCount || 0}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-4">Historical Duration Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={(performance?.history || []).map((h) => ({
                  time: new Date(h.completedAt).toLocaleDateString(),
                  durationSec: Math.round(h.durationMs / 1000),
                }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} unit="s" />
                  <Tooltip />
                  <Line type="monotone" dataKey="durationSec" stroke="#0F766E" strokeWidth={2} name="Duration (s)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'configuration' && (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs max-w-2xl space-y-4 text-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Job Configuration Specifications</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-slate-400 block">Job Identifier Key</span>
              <span className="font-mono text-slate-800">{job.jobKey}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Schedule Pattern</span>
              <span className="font-mono text-slate-800">{job.schedule}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Time Zone</span>
              <span className="text-slate-800">{job.timezone || 'UTC'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Retry Delay</span>
              <span className="text-slate-800">{Math.round((job.retryDelayMs || 0) / 1000)}s</span>
            </div>
            <div>
              <span className="text-slate-400 block">Job Type</span>
              <span className="text-slate-800 capitalize">{job.jobType}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Simulation Base Duration</span>
              <span className="text-slate-800">{Math.round((job.simulationConfig?.baseDurationMs || 0) / 1000)}s</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
