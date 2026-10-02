import React from 'react';
import { SafetyMetrics as SafetyMetricsType } from '../../lib/types';
import { Users, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

interface SafetyMetricsProps {
  metrics: SafetyMetricsType | null;
}

export const SafetyMetrics: React.FC<SafetyMetricsProps> = ({ metrics }) => {
  if (!metrics) return null;

  const {
    people_detected,
    people_with_visible_helmet,
    people_without_visible_helmet,
    visible_helmet_compliance_pct,
    helmet_model_available,
  } = metrics;

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-text flex items-center gap-2">
          <Shield className="w-4 h-4 text-brand" />
          Safety & PPE Observation
        </h3>
        <span className="text-xs text-slate-muted">
          Mode: {helmet_model_available ? 'Full Compliance Check' : 'Person Only'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-1.5 text-slate-muted text-xs font-medium">
            <Users className="w-3.5 h-3.5" />
            People Detected
          </div>
          <p className="text-2xl font-mono font-bold text-slate-900 mt-1">
            {people_detected}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-1.5 text-slate-muted text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Helmets Visible
          </div>
          <p className="text-2xl font-mono font-bold text-emerald-700 mt-1">
            {people_with_visible_helmet}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-1.5 text-slate-muted text-xs font-medium">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            No Helmet Detected
          </div>
          <p className="text-2xl font-mono font-bold text-red-700 mt-1">
            {people_without_visible_helmet}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-slate-muted text-xs font-medium">
            Visible Compliance
          </div>
          <p className="text-2xl font-mono font-bold text-slate-900 mt-1">
            {visible_helmet_compliance_pct !== null ? `${Math.round(visible_helmet_compliance_pct)}%` : '—'}
          </p>
        </div>
      </div>

      {visible_helmet_compliance_pct !== null && (
        <div className="space-y-1.5">
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                visible_helmet_compliance_pct >= 80
                  ? 'bg-emerald-600'
                  : visible_helmet_compliance_pct >= 50
                  ? 'bg-amber-500'
                  : 'bg-red-600'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, visible_helmet_compliance_pct))}%` }}
              role="progressbar"
              aria-valuenow={Math.round(visible_helmet_compliance_pct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`PPE compliance rate: ${Math.round(visible_helmet_compliance_pct)}%`}
            />
          </div>
        </div>
      )}

      <p className="text-xs text-slate-muted italic">
        Compliance is computed from visible detections only. Occluded individuals or helmets outside the frame are not counted.
      </p>
    </div>
  );
};
