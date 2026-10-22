import React, { useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge } from '../components/common/Badges';
import { useAuth } from '../context/AuthContext';
import {
  Download,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  X,
} from 'lucide-react';

export const ExecutionHistoryPage = () => {
  const { refreshKey, triggerRefresh } = useOutletContext();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [executions, setExecutions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(true);

  // Filters
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [triggerType, setTriggerType] = useState('');

  // Logs Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const isOperatorOrAdmin = user?.role === 'admin' || user?.role === 'operator';

  const fetchExecutions = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page,
        limit,
        ...(status && { status }),
        ...(triggerType && { triggerType }),
      });
      const res = await api.get(`/executions?${query.toString()}`);
      setExecutions(res.data.data);
      setTotal(res.data.pagination.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutions();
  }, [refreshKey, page, status, triggerType]);

  const handleRetry = async (executionId) => {
    try {
      await api.post(`/executions/${executionId}/retry`);
      alert('Retry triggered successfully');
      triggerRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to retry execution');
    }
  };

  const handleExportCSV = async () => {
    try {
      const query = new URLSearchParams({
        ...(status && { status }),
        ...(triggerType && { triggerType }),
      });
      const response = await api.get(`/executions/export?${query.toString()}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `executions_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export CSV: ' + (err.response?.data?.message || err.message));
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Execution History</h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete audit trail of all historical scheduled, manual, and retry batch runs.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded text-xs border border-slate-200"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 text-slate-700"
          >
            <option value="">Status: All</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="timed_out">Timed Out</option>
            <option value="running">Running</option>
            <option value="queued">Queued</option>
          </select>

          <select
            value={triggerType}
            onChange={(e) => { setTriggerType(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 text-slate-700"
          >
            <option value="">Trigger: All</option>
            <option value="scheduled">Scheduled</option>
            <option value="manual">Manual</option>
            <option value="retry">Retry</option>
          </select>
        </div>
      </div>

      {/* Executions Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Job Name</th>
                <th className="px-4 py-3">Workflow</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Attempt</th>
                <th className="px-4 py-3">Trigger</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-xs text-slate-400">
                    Loading execution history...
                  </td>
                </tr>
              ) : executions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-xs text-slate-400">
                    No execution records found.
                  </td>
                </tr>
              ) : (
                executions.map((ex) => (
                  <tr key={ex._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{ex.jobId?.name || 'N/A'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{ex.jobId?.jobKey}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{ex.workflowId?.name || 'N/A'}</td>
                    <td className="px-4 py-3"><StatusBadge status={ex.status} /></td>
                    <td className="px-4 py-3">{new Date(ex.startedAt || ex.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">{ex.durationMs ? `${Math.round(ex.durationMs / 1000)}s` : '-'}</td>
                    <td className="px-4 py-3">#{ex.attemptNumber}</td>
                    <td className="px-4 py-3 capitalize">{ex.triggerType}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => setSelectedLog(ex)}
                          className="p-1 hover:text-teal-700 text-slate-500 rounded"
                          title="View Execution Logs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        {isOperatorOrAdmin && ['failed', 'timed_out'].includes(ex.status) && (
                          <button
                            onClick={() => handleRetry(ex._id)}
                            className="p-1 hover:text-teal-700 text-slate-500 rounded"
                            title="Retry Execution"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} runs
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

      {/* Execution Logs Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Execution Output Logs
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  {selectedLog.jobId?.name} ({selectedLog._id})
                </span>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 font-mono text-[11px] text-slate-300 overflow-y-auto flex-1 space-y-1">
              {(!selectedLog.logs || selectedLog.logs.length === 0) ? (
                <div className="text-slate-500">No output logs recorded for this execution.</div>
              ) : (
                selectedLog.logs.map((line, idx) => (
                  <div key={idx} className="leading-relaxed">
                    {line}
                  </div>
                ))
              )}
              {selectedLog.errorMessage && (
                <div className="text-rose-400 pt-2 border-t border-slate-800">
                  ERROR: {selectedLog.errorMessage}
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
