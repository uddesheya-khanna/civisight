import React from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { DisclaimerBanner } from '../components/layout/DisclaimerBanner';
import { Button } from '../components/ui/Button';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { MODULE_DEFINITIONS, ModuleDefinition } from '../lib/modules';
import { useBackendHealth } from '../hooks/useBackendHealth';
import { useHistory } from '../hooks/useHistory';
import { ArrowRight, Search, Server } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { health, isOnline } = useBackendHealth();
  const { records } = useHistory();

  const totalInspections = records.length;
  const highSeverityCount = records.filter(
    (r) => r.overall_severity === 'high'
  ).length;
  const lastInspectedTime = records.length > 0 ? new Date(records[0].created_at).toLocaleString() : 'None';

  return (
    <PageShell title="Dashboard">
      <div className="space-y-8 py-8 px-4 sm:px-6 max-w-screen-xl mx-auto">
        <DisclaimerBanner />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Inspection Operations Dashboard
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Select an inspection module to begin analysis or review recent inspections.
            </p>
          </div>
          <Link to="/inspect/crack_detection">
            <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Start New Inspection
            </Button>
          </Link>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface p-4 rounded-xl border border-border">
            <p className="text-xs font-medium text-slate-500">Total Inspections</p>
            <p className="text-2xl font-mono font-bold text-slate-900 mt-1">
              {totalInspections}
            </p>
          </div>
          <div className="bg-surface p-4 rounded-xl border border-border">
            <p className="text-xs font-medium text-slate-500">High-Severity Findings</p>
            <p className="text-2xl font-mono font-bold text-red-600 mt-1">
              {highSeverityCount}
            </p>
          </div>
          <div className="bg-surface p-4 rounded-xl border border-border">
            <p className="text-xs font-medium text-slate-500">Last Inspected</p>
            <p className="text-sm font-mono text-slate-700 mt-2 truncate">
              {lastInspectedTime}
            </p>
          </div>
        </div>

        {/* Inspection Modules Grid */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Select Inspection Module</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MODULE_DEFINITIONS.map((m: ModuleDefinition) => {
              const moduleHealth = health?.modules ? health.modules[m.id] : null;

              return (
                <div
                  key={m.id}
                  className="bg-surface border border-border rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-brand transition-all shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {m.targetDefect}
                      </span>
                      {moduleHealth ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Ready
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Checking...</span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{m.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{m.description}</p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-border text-xs text-slate-500">
                    <p>
                      <strong className="text-slate-700">Surface:</strong> {m.surface}
                    </p>
                    <p>
                      <strong className="text-slate-700">Model:</strong> {m.modelPipeline}
                    </p>
                    <Link to={`/inspect/${m.id}`} className="block pt-2">
                      <Button variant="primary" className="w-full">
                        Inspect {m.title.split(' ')[0]}
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System & Recent History Two-Column */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Recent Inspections (2 Cols) */}
          <div className="lg:col-span-2 bg-surface p-5 rounded-2xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Recent Inspections</h2>
              {records.length > 5 && (
                <Link to="/inspections" className="text-xs text-brand font-medium hover:underline">
                  View All ({records.length})
                </Link>
              )}
            </div>

            {records.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs space-y-2">
                <Search className="w-8 h-8 mx-auto text-slate-300" />
                <p>No inspections run yet. Choose a module above to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {records.slice(0, 5).map((r) => (
                  <Link
                    key={r.analysis_id}
                    to={`/inspections/${r.analysis_id}`}
                    className="flex items-center justify-between py-3 hover:bg-slate-50 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={r.result?.image?.annotated_url || `/api/files/${r.analysis_id}/annotated`}
                        alt="thumbnail"
                        className="w-12 h-12 object-cover rounded-lg border border-border bg-slate-100"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div>
                        <p className="text-xs font-semibold text-slate-900 capitalize">
                          {r.inspection_type.replace('_', ' ')}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {new Date(r.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {r.overall_severity && (
                        <SeverityBadge severity={r.overall_severity} size="sm" />
                      )}
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* System Status (1 Col) */}
          <div className="bg-surface p-5 rounded-2xl border border-border space-y-4 text-xs">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-brand" />
              System Status
            </h2>

            <div className="space-y-2 font-mono">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Backend:</span>
                <span className={isOnline ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                  {isOnline ? 'Online (:8000)' : 'Offline'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Compute Device:</span>
                <span className="text-slate-800 font-semibold uppercase">{health?.device || 'cpu'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Version:</span>
                <span className="text-slate-800">{health?.version || '1.0.0'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Max Upload:</span>
                <span className="text-slate-800">{health?.limits?.max_upload_mb || 10} MB</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Retention:</span>
                <span className="text-slate-800">24-hour auto-clean</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
};
