import React from 'react';
import { ConditionIndicator as ConditionIndicatorType } from '../../lib/types';
import { Info, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface ConditionIndicatorProps {
  indicator: ConditionIndicatorType;
  className?: string;
}

export const ConditionIndicator: React.FC<ConditionIndicatorProps> = ({ indicator, className = '' }) => {
  const [showFormula, setShowFormula] = useState(false);

  const { value, band, factors, explanation, formula_id } = indicator;

  const bandConfig = {
    green: { text: 'Lower visual concern', textClass: 'text-severity-low-text', bgClass: 'bg-severity-low-bg', barClass: 'bg-severity-low-text' },
    amber: { text: 'Moderate visual concern', textClass: 'text-severity-moderate-text', bgClass: 'bg-severity-moderate-bg', barClass: 'bg-severity-moderate-text' },
    red: { text: 'Higher visual concern', textClass: 'text-severity-high-text', bgClass: 'bg-severity-high-bg', barClass: 'bg-severity-high-text' },
  };

  const cfg = band ? bandConfig[band] : null;
  const pct = value !== null && value !== undefined ? value : null;

  return (
    <div className={`rounded-xl border border-border bg-surface p-5 space-y-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-text">
            AI-Assisted Visual Condition Indicator
          </h3>
          <p className="text-xs text-slate-muted mt-0.5">Not a structural safety score</p>
        </div>
        <div className="text-right shrink-0">
          {pct !== null ? (
            <span className={`text-2xl font-mono font-bold ${cfg?.textClass || 'text-slate-text'}`}>
              {pct}
              <span className="text-sm font-medium text-slate-muted">/100</span>
            </span>
          ) : (
            <span className="text-sm text-slate-muted italic">Not computed</span>
          )}
        </div>
      </div>

      {pct !== null && cfg ? (
        <>
          <div className="space-y-1.5">
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${cfg.barClass}`}
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Condition indicator: ${pct} out of 100`}
              />
            </div>
            <span className={`text-xs font-medium ${cfg.textClass}`}>{cfg.text}</span>
          </div>

          {factors.length > 0 && (
            <div>
              <button
                onClick={() => setShowFormula((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-brand font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-brand rounded"
              >
                <Info className="w-3.5 h-3.5" />
                How is this calculated?
                {showFormula ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showFormula && (
                <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <p className="text-xs text-slate-muted">Formula: <code className="font-mono text-slate-700">{formula_id}</code></p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-1 pr-2 font-medium text-slate-text">Factor</th>
                        <th className="text-left py-1 pr-2 font-medium text-slate-text">Detail</th>
                        <th className="text-right py-1 font-medium text-slate-text">Penalty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {factors.map((f, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="py-1 pr-2 text-slate-700">{f.name}</td>
                          <td className="py-1 pr-2 text-slate-500">{f.detail}</td>
                          <td className="py-1 text-right font-mono text-slate-700">{f.penalty.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-slate-muted italic">{explanation}</p>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
          <TrendingDown className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-muted">
            Not computed — no significant target detected. This is not an indication of good condition.
          </p>
        </div>
      )}
    </div>
  );
};
