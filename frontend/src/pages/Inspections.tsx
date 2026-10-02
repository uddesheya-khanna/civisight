import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { DisclaimerBanner } from '../components/layout/DisclaimerBanner';
import { Button } from '../components/ui/Button';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { useHistory } from '../hooks/useHistory';
import { api } from '../lib/api';
import {
  Search,
  Trash2,
  Download,
  Eye,
  ArrowUpDown,
  History,
} from 'lucide-react';

export const Inspections: React.FC = () => {
  const { records, remove, clearAll } = useHistory();
  const [filterModule, setFilterModule] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = records
    .filter((r) => {
      if (filterModule !== 'all' && r.inspection_type !== filterModule) return false;
      if (filterSeverity !== 'all' && r.overall_severity !== filterSeverity) return false;
      return true;
    })
    .sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? db - da : da - db;
    });

  const handleDownloadPdf = async (analysisId: string) => {
    try {
      const blob = await api.downloadReport(analysisId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `civisight_report_${analysisId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Could not download PDF. The analysis files may have expired on the server.');
    }
  };

  return (
    <PageShell title="Inspections History">
      <div className="space-y-6 py-6 px-4 sm:px-6 max-w-screen-xl mx-auto">
        <DisclaimerBanner />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <History className="w-6 h-6 text-brand" />
              Inspections History
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Browse and review past infrastructure analyses stored in this browser session.
            </p>
          </div>

          {records.length > 0 && (
            <div>
              {confirmClear ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600 font-medium">Clear all?</span>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      clearAll();
                      setConfirmClear(false);
                    }}
                  >
                    Confirm
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setConfirmClear(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={() => setConfirmClear(true)}
                >
                  Clear History
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Filters Bar */}
        <div className="bg-surface p-4 rounded-xl border border-border flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Module:</span>
              <select
                value={filterModule}
                onChange={(e) => setFilterModule(e.target.value)}
                className="rounded border border-slate-200 px-2 py-1 bg-white text-slate-800"
              >
                <option value="all">All Modules</option>
                <option value="crack_detection">Crack Detection</option>
                <option value="pothole_detection">Pothole Detection</option>
                <option value="safety_detection">Safety & PPE</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Severity:</span>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="rounded border border-slate-200 px-2 py-1 bg-white text-slate-800"
              >
                <option value="all">All Severities</option>
                <option value="high">High</option>
                <option value="moderate">Moderate</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => setSortOrder((v) => (v === 'desc' ? 'asc' : 'desc'))}
            className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sort: {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}</span>
          </button>
        </div>

        {/* Records Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-surface rounded-2xl border border-border space-y-3">
            <Search className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-semibold text-slate-800">No inspections found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {records.length === 0
                ? 'Run your first inspection to start seeing history records here.'
                : 'No inspections match the current filters.'}
            </p>
            {records.length === 0 && (
              <div className="pt-2">
                <Link to="/inspect/crack_detection">
                  <Button variant="primary" size="sm">
                    Start an Inspection
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-border text-slate-muted uppercase font-medium">
                  <tr>
                    <th className="py-3 px-4">Thumbnail</th>
                    <th className="py-3 px-4">ID / Time</th>
                    <th className="py-3 px-4">Module</th>
                    <th className="py-3 px-4">Findings</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Condition</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((r) => (
                    <tr key={r.analysis_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-4">
                        <img
                          src={r.result?.image?.annotated_url || `/api/files/${r.analysis_id}/annotated`}
                          alt="thumbnail"
                          className="w-12 h-12 object-cover rounded-md border border-border bg-slate-100"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </td>
                      <td className="py-2 px-4">
                        <p className="font-mono font-medium text-slate-900">
                          #{r.analysis_id.slice(0, 8)}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {new Date(r.created_at).toLocaleString()}
                        </p>
                      </td>
                      <td className="py-2 px-4 capitalize text-slate-700 font-medium">
                        {r.inspection_type.replace('_', ' ')}
                      </td>
                      <td className="py-2 px-4 font-mono text-slate-700">
                        {r.total_detections}
                      </td>
                      <td className="py-2 px-4">
                        {r.overall_severity ? (
                          <SeverityBadge severity={r.overall_severity} size="sm" />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2 px-4 font-mono font-medium">
                        {r.condition_value !== null && r.condition_value !== undefined ? (
                          <span>{r.condition_value}/100</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/inspections/${r.analysis_id}`}>
                            <button
                              className="p-1.5 text-slate-600 hover:text-brand rounded hover:bg-slate-100"
                              title="View inspection"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </Link>
                          <button
                            onClick={() => handleDownloadPdf(r.analysis_id)}
                            className="p-1.5 text-slate-600 hover:text-brand rounded hover:bg-slate-100"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => remove(r.analysis_id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100"
                            title="Delete record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
};
