import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Sliders, Save, Check } from 'lucide-react';

export const SettingsPage = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        setSettings(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      await api.patch('/settings', {
        prediction: settings.prediction,
        scheduler: settings.scheduler,
        thresholds: settings.thresholds,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating settings');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure baseline prediction thresholds, anomaly detection multipliers, and scheduler intervals.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Prediction Settings */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Predictive Baseline Engine Configuration
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Minimum Samples Required for Predictions
              </label>
              <input
                type="number"
                disabled={!isAdmin}
                value={settings?.prediction?.minSamples || 5}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    prediction: { ...settings.prediction, minSamples: parseInt(e.target.value) },
                  })
                }
                className="w-full p-2 border border-slate-300 rounded disabled:bg-slate-50"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Prevents premature false positive alerts when history is insufficient.
              </span>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Anomaly Multiplier (Above Median Baseline)
              </label>
              <input
                type="number"
                step="0.1"
                disabled={!isAdmin}
                value={settings?.prediction?.anomalyMultiplier || 1.5}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    prediction: { ...settings.prediction, anomalyMultiplier: parseFloat(e.target.value) },
                  })
                }
                className="w-full p-2 border border-slate-300 rounded disabled:bg-slate-50"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                1.5 = Alerts trigger when recent execution average exceeds 150% of median.
              </span>
            </div>
          </div>
        </div>

        {/* Scheduler Settings */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Scheduler & Simulator Settings
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Max Concurrent Executions
              </label>
              <input
                type="number"
                disabled={!isAdmin}
                value={settings?.scheduler?.maxConcurrentJobs || 5}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    scheduler: { ...settings.scheduler, maxConcurrentJobs: parseInt(e.target.value) },
                  })
                }
                className="w-full p-2 border border-slate-300 rounded disabled:bg-slate-50"
              />
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded text-xs shadow-xs"
            >
              {saved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
              <span>{saved ? 'Saved Successfully' : 'Save System Settings'}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
