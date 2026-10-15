import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge, SeverityBadge } from '../components/common/Badges';
import { ArrowLeft, Share2, Play, AlertTriangle, Layers, Plus } from 'lucide-react';

export const WorkflowDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkflow = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/workflows/${id}`);
        setWorkflow(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkflow();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading workflow details...</div>;
  }

  if (!workflow) {
    return <div className="p-8 text-center text-xs text-rose-500">Workflow not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <Link to="/workflows" className="inline-flex items-center gap-1 text-xs text-teal-700 hover:text-teal-800 font-medium mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Workflows
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{workflow.name}</h1>
            <StatusBadge status={workflow.health} />
            <SeverityBadge severity={workflow.criticality} />
          </div>
          <p className="text-xs text-slate-500 mt-1">{workflow.description || 'No description provided.'}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/dependencies?workflowId=${workflow._id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded text-xs transition-colors shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Open Dependency DAG</span>
          </Link>
        </div>
      </div>

      {/* Health Overview Banner */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Operational Health Summary</span>
          <div className="text-sm font-semibold text-slate-800 mt-0.5">{workflow.healthReason}</div>
        </div>

        <div className="flex items-center gap-6 text-xs">
          <div>
            <span className="text-slate-400 block">Total Jobs</span>
            <span className="font-bold text-slate-800">{workflow.jobStats?.total || 0}</span>
          </div>
          <div>
            <span className="text-emerald-600 block">Success</span>
            <span className="font-bold text-emerald-600">{workflow.jobStats?.success || 0}</span>
          </div>
          <div>
            <span className="text-rose-600 block">Failed</span>
            <span className="font-bold text-rose-600">{workflow.jobStats?.failed || 0}</span>
          </div>
          <div>
            <span className="text-amber-600 block">Blocked</span>
            <span className="font-bold text-amber-600">{workflow.jobStats?.blocked || 0}</span>
          </div>
        </div>
      </div>

      {/* Associated Jobs List */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Jobs In This Workflow</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {(workflow.jobs || []).map((job) => (
            <div
              key={job._id}
              onClick={() => navigate(`/jobs/${job._id}`)}
              className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors text-xs"
            >
              <div>
                <div className="font-semibold text-slate-900">{job.name}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{job.jobKey}</div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-slate-500">{job.schedule || 'Manual'}</span>
                <StatusBadge status={job.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
