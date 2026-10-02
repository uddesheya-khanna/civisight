import React, { useState } from 'react';
import { Detection, InspectionType } from '../../lib/types';
import { SeverityBadge } from '../ui/SeverityBadge';
import { AlertTriangle, HelpCircle } from 'lucide-react';

interface FindingsTableProps {
  detections: Detection[];
  inspectionType: InspectionType;
  selectedId: number | null;
  onSelectDetection: (id: number | null) => void;
}

export const FindingsTable: React.FC<FindingsTableProps> = ({
  detections,
  inspectionType,
  selectedId,
  onSelectDetection,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  if (detections.length === 0) {
    return null;
  }

  const isClassical = detections.some((d) => d.score_type === 'heuristic_score');
  const scoreHeader = isClassical ? 'Ridge strength (heuristic)' : 'Confidence';

  const filtered = detections.filter((d) => {
    if (filterSeverity === 'all') return true;
    return d.severity === filterSeverity;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-slate-text">
          Findings List ({detections.length})
        </h3>
        {/* Severity filter */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-muted">Filter:</span>
          {(['all', 'high', 'moderate', 'low'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2 py-0.5 rounded capitalize font-medium transition-colors ${
                filterSeverity === sev
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto border border-border rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-border text-slate-muted uppercase font-medium">
            <tr>
              <th className="py-2.5 px-3">#</th>
              <th className="py-2.5 px-3">Target</th>
              <th className="py-2.5 px-3">Location</th>
              <th className="py-2.5 px-3">Area / Extent</th>
              <th className="py-2.5 px-3">{scoreHeader}</th>
              <th className="py-2.5 px-3">Severity</th>
              {inspectionType === 'safety_detection' && (
                <th className="py-2.5 px-3">Helmet Status</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((d) => {
              const isSelected = selectedId === d.id;
              const helmetStatus = d.attributes?.helmet_status;

              return (
                <tr
                  key={d.id}
                  onClick={() => onSelectDetection(isSelected ? null : d.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-brand-light font-medium'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="py-2 px-3 font-mono text-slate-700">#{d.id}</td>
                  <td className="py-2 px-3 font-medium capitalize text-slate-900">
                    {d.type.replace('_', ' ')}
                  </td>
                  <td className="py-2 px-3 text-slate-600 capitalize">
                    {(d.location || '').replace('_', '-')}
                  </td>
                  <td className="py-2 px-3 text-slate-600 font-mono">
                    {(d.area_ratio * 100).toFixed(2)}%
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1.5 font-mono">
                      <span>{d.score.toFixed(2)}</span>
                      {d.low_confidence && (
                        <span
                          title="Confidence below 0.35. Visual verification recommended."
                          className="inline-flex items-center text-amber-600"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {d.score_type === 'heuristic_score' && (
                        <span
                          title="Computed from Sato ridge filter intensity, not model probability."
                          className="inline-flex items-center text-slate-400"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    {d.severity ? (
                      <SeverityBadge severity={d.severity} size="sm" />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  {inspectionType === 'safety_detection' && (
                    <td className="py-2 px-3">
                      {helmetStatus === 'helmet_visible' && (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-200">
                          Helmet visible
                        </span>
                      )}
                      {helmetStatus === 'helmet_not_visibly_detected' && (
                        <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded text-[11px] font-medium border border-red-200">
                          Helmet not visibly detected
                        </span>
                      )}
                      {helmetStatus === 'not_assessable_small' && (
                        <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium">
                          Too distant to assess
                        </span>
                      )}
                      {!helmetStatus && <span className="text-slate-400">—</span>}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
