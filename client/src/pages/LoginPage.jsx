import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Server, Lock, Mail, AlertCircle } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('admin@batchmonitor.dev');
  const [password, setPassword] = useState('Admin@1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (roleEmail, rolePassword) => {
    setEmail(roleEmail);
    setPassword(rolePassword);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl overflow-hidden border border-slate-200">
        <div className="bg-slate-800 p-6 text-center border-b border-slate-700">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-teal-600 text-white mb-3">
            <Server className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Enterprise Batch Monitor</h2>
          <p className="text-xs text-slate-400 mt-1">Scheduled Jobs & Dependency Intelligence Console</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
                placeholder="name@company.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded text-sm transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Operations Console'}
          </button>
        </form>

        <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-600">
          <p className="font-semibold text-slate-700 mb-2">Demo Quick Select Accounts:</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setDemoCredentials('admin@batchmonitor.dev', 'Admin@1234')}
              className="py-1 px-2 text-center bg-white border border-slate-200 rounded hover:border-teal-600 hover:text-teal-700 text-[11px] font-medium"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('operator@batchmonitor.dev', 'Operator@1234')}
              className="py-1 px-2 text-center bg-white border border-slate-200 rounded hover:border-teal-600 hover:text-teal-700 text-[11px] font-medium"
            >
              Operator
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('viewer@batchmonitor.dev', 'Viewer@1234')}
              className="py-1 px-2 text-center bg-white border border-slate-200 rounded hover:border-teal-600 hover:text-teal-700 text-[11px] font-medium"
            >
              Viewer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
