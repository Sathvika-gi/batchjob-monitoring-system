import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import api from '../services/api';
import { JobNode } from '../components/dependency-graph/JobNode';
import { StatusBadge, SeverityBadge } from '../components/common/Badges';
import {
  Share2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  AlertTriangle,
  Play,
  RotateCw,
  Plus,
  X,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const nodeTypes = {
  jobNode: JobNode,
};

export const DependencyExplorerPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(
    searchParams.get('workflowId') || ''
  );

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);

  // Inspector Panel State
  const [selectedJob, setSelectedJob] = useState(null);
  const [impactAnalysis, setImpactAnalysis] = useState(null);
  const [rootCause, setRootCause] = useState(null);

  // Add Dependency Modal
  const [showAddDepModal, setShowAddDepModal] = useState(false);
  const [depForm, setDepForm] = useState({ upstreamJobId: '', downstreamJobId: '' });
  const [depError, setDepError] = useState('');

  const isOperatorOrAdmin = user?.role === 'admin' || user?.role === 'operator';

  // Load Workflows
  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const res = await api.get('/workflows?limit=100');
        setWorkflows(res.data.data);
        if (!selectedWorkflowId && res.data.data.length > 0) {
          setSelectedWorkflowId(res.data.data[0]._id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchWorkflows();
  }, []);

  // Sync with URL params
  useEffect(() => {
    const wfFromParam = searchParams.get('workflowId');
    if (wfFromParam && wfFromParam !== selectedWorkflowId) {
      setSelectedWorkflowId(wfFromParam);
    }
  }, [searchParams]);

  // Load Graph for Selected Workflow
  const loadGraph = useCallback(async () => {
    if (!selectedWorkflowId) return;
    setLoading(true);
    setSelectedJob(null);
    setImpactAnalysis(null);
    setRootCause(null);

    try {
      const res = await api.get(`/workflows/${selectedWorkflowId}/graph`);
      const { nodes: graphNodes, edges: graphEdges } = res.data.data;

      // Arrange nodes in level layout
      const levelMap = {};
      const inDegree = {};
      graphNodes.forEach((n) => (inDegree[n.id] = 0));
      graphEdges.forEach((e) => {
        inDegree[e.target] = (inDegree[e.target] || 0) + 1;
      });

      // BFS to determine layer depth
      const queue = graphNodes.filter((n) => inDegree[n.id] === 0).map((n) => n.id);
      queue.forEach((id) => (levelMap[id] = 0));

      while (queue.length > 0) {
        const curr = queue.shift();
        const currLevel = levelMap[curr];
        const outgoing = graphEdges.filter((e) => e.source === curr).map((e) => e.target);
        outgoing.forEach((targetId) => {
          levelMap[targetId] = Math.max(levelMap[targetId] || 0, currLevel + 1);
          queue.push(targetId);
        });
      }

      // Group nodes by level to position X and Y
      const nodesByLevel = {};
      graphNodes.forEach((n) => {
        const lvl = levelMap[n.id] || 0;
        if (!nodesByLevel[lvl]) nodesByLevel[lvl] = [];
        nodesByLevel[lvl].push(n);
      });

      const formattedNodes = graphNodes.map((n) => {
        const lvl = levelMap[n.id] || 0;
        const indexInLevel = nodesByLevel[lvl].findIndex((node) => node.id === n.id);
        const totalInLevel = nodesByLevel[lvl].length;

        return {
          id: n.id,
          type: 'jobNode',
          position: {
            x: 250 + (indexInLevel - (totalInLevel - 1) / 2) * 260,
            y: 80 + lvl * 150,
          },
          data: n.data,
        };
      });

      const formattedEdges = graphEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94A3B8' },
        style: { stroke: '#94A3B8', strokeWidth: 1.5 },
      }));

      setNodes(formattedNodes);
      setEdges(formattedEdges);
    } catch (err) {
      console.error('Failed to load dependency graph', err);
    } finally {
      setLoading(false);
    }
  }, [selectedWorkflowId]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const handleNodeClick = async (_, node) => {
    try {
      const [jobRes, impactRes] = await Promise.all([
        api.get(`/jobs/${node.id}`),
        api.get(`/jobs/${node.id}/impact`),
      ]);
      setSelectedJob(jobRes.data.data);
      setImpactAnalysis(impactRes.data.data);

      if (['failed', 'timed_out'].includes(jobRes.data.data.status)) {
        // Fetch root cause analysis
        const perf = await api.get(`/jobs/${node.id}/performance`);
        // Highlight edges
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateDependency = async (e) => {
    e.preventDefault();
    setDepError('');
    try {
      await api.post('/dependencies', {
        workflowId: selectedWorkflowId,
        upstreamJobId: depForm.upstreamJobId,
        downstreamJobId: depForm.downstreamJobId,
        dependencyType: 'required',
      });
      setShowAddDepModal(false);
      setDepForm({ upstreamJobId: '', downstreamJobId: '' });
      loadGraph();
    } catch (err) {
      setDepError(
        err.response?.data?.message || 'Failed to save dependency relationship'
      );
    }
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col space-y-4">
      {/* Top Controls Toolbar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
            <Share2 className="w-4 h-4 text-teal-700" />
            <span>Dependency Explorer</span>
          </div>

          <select
            value={selectedWorkflowId}
            onChange={(e) => {
              setSelectedWorkflowId(e.target.value);
              setSearchParams({ workflowId: e.target.value });
            }}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-slate-50 text-slate-800 font-medium"
          >
            {workflows.map((w) => (
              <option key={w._id} value={w._id}>
                Pipeline: {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {isOperatorOrAdmin && (
            <button
              onClick={() => setShowAddDepModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium border border-slate-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Dependency</span>
            </button>
          )}

          <button
            onClick={loadGraph}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
            title="Reload DAG"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas and Inspector Side Panel */}
      <div className="flex-1 flex gap-4 min-h-0 relative">
        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 bg-white/50 backdrop-blur-xs z-20">
              Rendering Dependency DAG...
            </div>
          ) : null}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background color="#CBD5E1" gap={16} />
            <Controls className="bg-white border border-slate-200 shadow-xs rounded text-slate-700" />
            <MiniMap
              nodeColor={(n) => {
                if (n.data?.status === 'failed') return '#EF4444';
                if (n.data?.status === 'blocked') return '#F59E0B';
                if (n.data?.status === 'running') return '#3B82F6';
                return '#10B981';
              }}
              className="border border-slate-200 rounded shadow-xs"
            />
          </ReactFlow>

          {/* Graph Legend */}
          <div className="absolute bottom-3 left-3 bg-white/95 border border-slate-200 p-2.5 rounded shadow-xs text-[10px] space-y-1 backdrop-blur-xs z-10">
            <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Legend
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600">Success / Operational</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span className="text-slate-600">Failed / Primary Root Cause</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-slate-600">Blocked / Impacted Path</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="text-slate-600">Executing / In-Progress</span>
            </div>
          </div>
        </div>

        {/* Selected Job Inspector Side Panel */}
        {selectedJob && (
          <div className="w-80 bg-white border border-slate-200 rounded-lg shadow-sm p-4 overflow-y-auto space-y-4 flex flex-col text-xs flex-shrink-0 animate-in slide-in-from-right-4 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{selectedJob.name}</h3>
                <span className="text-[10px] font-mono text-slate-400">{selectedJob.jobKey}</span>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Status</span>
              <StatusBadge status={selectedJob.status} />
            </div>

            {impactAnalysis && (
              <div className="bg-slate-50 p-3 rounded border border-slate-100 space-y-2">
                <span className="font-semibold text-slate-700 block">Failure Impact Analysis</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {impactAnalysis.summary}
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 text-[10px]">
                  <div>
                    <span className="text-slate-400">Directly Blocked</span>
                    <div className="font-bold text-slate-800">{impactAnalysis.directlyImpacted?.length || 0}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Total Transitive</span>
                    <div className="font-bold text-slate-800">{impactAnalysis.totalAffected || 0}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={() => navigate(`/jobs/${selectedJob._id}`)}
                className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white rounded font-medium text-center shadow-xs"
              >
                Open Full Job Details
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Dependency Modal with Cycle Detection validation check */}
      {showAddDepModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Connect Dependency Edge
              </h3>
              <button onClick={() => setShowAddDepModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDependency} className="p-5 space-y-4 text-xs">
              {depError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{depError}</span>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 mb-1">Upstream Prerequisite Job</label>
                <select
                  required
                  value={depForm.upstreamJobId}
                  onChange={(e) => setDepForm({ ...depForm, upstreamJobId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded"
                >
                  <option value="">Select Upstream Job</option>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>{n.data.label} ({n.data.jobKey})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Downstream Dependent Job</label>
                <select
                  required
                  value={depForm.downstreamJobId}
                  onChange={(e) => setDepForm({ ...depForm, downstreamJobId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded"
                >
                  <option value="">Select Downstream Job</option>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>{n.data.label} ({n.data.jobKey})</option>
                  ))}
                </select>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded border border-slate-100">
                Notice: Backend DFS validation automatically detects cycles and blocks recursive dependency relationships.
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDepModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded"
                >
                  Save Dependency
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
