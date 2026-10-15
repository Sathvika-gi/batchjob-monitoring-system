import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import api, { getApiErrorMessage } from '../services/api';
import { StatusBadge, SeverityBadge } from '../components/common/Badges';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Filter,
  Plus,
  Play,
  RotateCw,
  Power,
  ChevronRight,
  ChevronLeft,
  X,
  AlertCircle,
} from 'lucide-react';

export const JobsPage = () => {
  const { refreshKey, triggerRefresh } = useOutletContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState('');
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState('');

  // Create Job Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [createForm, setCreateForm] = useState({
    name: '',
    workflowId: '',
    jobType: 'batch',
    scheduleType: 'cron',
    schedule: '0 2 * * *',
    expectedDurationMs: 180000,
    timeoutMs: 900000,
    criticality: 'medium',
    description: '',
  });

  const isOperatorOrAdmin = user?.role === 'admin' || user?.role === 'operator';

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const res = await api.get('/workflows?limit=100');
        setWorkflows(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchWorkflows();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const query = new URLSearchParams({
        page,
        limit,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(criticalityFilter && { criticality: criticalityFilter }),
        ...(selectedWorkflow && { workflowId: selectedWorkflow }),
      });
      const res = await api.get(`/jobs?${query.toString()}`);
      setJobs(res.data.data);
      setTotal(res.data.pagination.total);
    } catch (err) {
      setJobs([]);
      setTotal(0);
      setLoadError(getApiErrorMessage(err, 'Failed to load jobs from MongoDB.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [refreshKey, page, statusFilter, criticalityFilter, selectedWorkflow]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchJobs();
  };

  const handleRunJob = async (jobId, e) => {
    e.stopPropagation();
    try {
      await api.post(`/jobs/${jobId}/run`);
      triggerRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to trigger job');
    }
  };

  const handleToggleEnable = async (job, e) => {
    e.stopPropagation();
    try {
      if (job.isEnabled) {
        await api.post(`/jobs/${job._id}/disable`);
      } else {
        await api.post(`/jobs/${job._id}/enable`);
      }
      triggerRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.post('/jobs', createForm);
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        workflowId: '',
        jobType: 'batch',
        scheduleType: 'cron',
        schedule: '0 2 * * *',
        expectedDurationMs: 180000,
        timeoutMs: 900000,
        criticality: 'medium',
        description: '',
      });
      triggerRefresh();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Validation error saving job');
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Job Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure scheduled batch jobs, trigger manual test runs, and monitor operational parameters.
          </p>
        </div>
        {isOperatorOrAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded text-xs transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Batch Job</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by job name or key..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
            />
          </div>
          <button type="submit" className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200">
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 text-slate-700"
          >
            <option value="">Status: All</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="running">Running</option>
            <option value="pending">Pending</option>
            <option value="blocked">Blocked</option>
          </select>

          <select
            value={criticalityFilter}
            onChange={(e) => { setCriticalityFilter(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 text-slate-700"
          >
            <option value="">Criticality: All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={selectedWorkflow}
            onChange={(e) => { setSelectedWorkflow(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 text-slate-700"
          >
            <option value="">Workflow: All</option>
            {workflows.map((w) => (
              <option key={w._id} value={w._id}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loadError && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {loadError}
        </div>
      )}

      {/* Jobs Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Job Name & Key</th>
                <th className="px-4 py-3">Workflow</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Criticality</th>
                <th className="px-4 py-3">Last Duration</th>
                <th className="px-4 py-3">Enabled</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-xs text-slate-400">
                    Loading jobs...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-xs text-slate-400">
                    {loadError ? 'Jobs could not be loaded.' : 'No jobs found matching criteria.'}
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr
                    key={job._id}
                    onClick={() => navigate(`/jobs/${job._id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{job.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{job.jobKey}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {job.workflowId?.name || 'Unassigned'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                      {job.schedule || 'Manual'}
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge severity={job.criticality} />
                    </td>
                    <td className="px-4 py-3">
                      {job.lastDurationMs ? `${Math.round(job.lastDurationMs / 1000)}s` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block w-2 h-2 rounded-full ${job.isEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {isOperatorOrAdmin && (
                          <>
                            <button
                              onClick={(e) => handleRunJob(job._id, e)}
                              title="Trigger manual demo run"
                              className="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleToggleEnable(job, e)}
                              title={job.isEnabled ? "Disable job" : "Enable job"}
                              className={`p-1 rounded ${job.isEnabled ? 'text-slate-500 hover:text-rose-600' : 'text-slate-400 hover:text-emerald-600'}`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <Link
                          to={`/jobs/${job._id}`}
                          className="p-1 text-slate-400 hover:text-slate-700"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing {jobs.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, total)} of {total} jobs
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-2 py-1 border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-2 py-1 border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Create Job Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Configure New Batch Job</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 mb-1">Job Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INGEST_RAW_TELEMETRY"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Workflow</label>
                  <select
                    required
                    value={createForm.workflowId}
                    onChange={(e) => setCreateForm({ ...createForm, workflowId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  >
                    <option value="">Select Target Workflow</option>
                    {workflows.map((w) => (
                      <option key={w._id} value={w._id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Criticality</label>
                  <select
                    value={createForm.criticality}
                    onChange={(e) => setCreateForm({ ...createForm, criticality: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Cron Schedule</label>
                  <input
                    type="text"
                    value={createForm.schedule}
                    onChange={(e) => setCreateForm({ ...createForm, schedule: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Job Type</label>
                  <select
                    value={createForm.jobType}
                    onChange={(e) => setCreateForm({ ...createForm, jobType: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  >
                    <option value="batch">Batch Processing</option>
                    <option value="etl">ETL Pipeline</option>
                    <option value="report">Report Generation</option>
                    <option value="backup">Backup Service</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows="2"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Operational purpose and context..."
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded"
                >
                  Save Batch Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
