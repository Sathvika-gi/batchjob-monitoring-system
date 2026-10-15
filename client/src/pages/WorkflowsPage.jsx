import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge, SeverityBadge } from '../components/common/Badges';
import { useAuth } from '../context/AuthContext';
import { Network, Plus, Share2, ChevronRight, X, AlertCircle } from 'lucide-react';

export const WorkflowsPage = () => {
  const { refreshKey, triggerRefresh } = useOutletContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    criticality: 'medium',
    tags: '',
  });
  const [error, setError] = useState('');

  const isOperatorOrAdmin = user?.role === 'admin' || user?.role === 'operator';

  useEffect(() => {
    const fetchWorkflows = async () => {
      setLoading(true);
      try {
        const res = await api.get('/workflows?limit=50');
        setWorkflows(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflows();
  }, [refreshKey]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/workflows', {
        ...form,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      setShowModal(false);
      setForm({ name: '', description: '', criticality: 'medium', tags: '' });
      triggerRefresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating workflow');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Workflows</h1>
          <p className="text-xs text-slate-500 mt-1">
            Collections of batch jobs organized as directed acyclic execution graphs.
          </p>
        </div>
        {isOperatorOrAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded text-xs transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Workflow</span>
          </button>
        )}
      </div>

      {/* Grid of Workflows */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-8 text-center text-xs text-slate-400">Loading workflows...</div>
        ) : workflows.length === 0 ? (
          <div className="col-span-full p-8 text-center text-xs text-slate-400">No workflows defined.</div>
        ) : (
          workflows.map((wf) => (
            <div
              key={wf._id}
              onClick={() => navigate(`/workflows/${wf._id}`)}
              className="bg-white rounded-lg border border-slate-200 shadow-xs hover:border-teal-600 transition-all cursor-pointer p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-slate-900 text-sm leading-tight hover:text-teal-700">
                    {wf.name}
                  </h3>
                  <StatusBadge status={wf.health} />
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                  {wf.description || 'No description provided.'}
                </p>

                <div className="bg-slate-50 p-3 rounded border border-slate-100 grid grid-cols-3 gap-2 text-center text-xs mb-4">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Total</span>
                    <div className="font-bold text-slate-800 mt-0.5">{wf.jobStats?.total || 0}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-600 uppercase font-semibold">Success</span>
                    <div className="font-bold text-emerald-600 mt-0.5">{wf.jobStats?.success || 0}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-rose-600 uppercase font-semibold">Failed</span>
                    <div className="font-bold text-rose-600 mt-0.5">{wf.jobStats?.failed || 0}</div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <SeverityBadge severity={wf.criticality} />
                <div className="flex items-center gap-2">
                  <Link
                    to={`/dependencies?workflowId=${wf._id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 hover:text-teal-700 text-slate-400"
                    title="View Dependency Graph"
                  >
                    <Share2 className="w-4 h-4" />
                  </Link>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Create Workflow</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {error && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 mb-1">Workflow Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Real-Time Risk Evaluation"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Criticality</label>
                <select
                  value={form.criticality}
                  onChange={(e) => setForm({ ...form, criticality: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="finance, reporting, risk"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows="3"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Operational scope of this pipeline..."
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded"
                >
                  Create Workflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
