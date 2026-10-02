import React from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { ProgressResponse } from '../../lib/types';

interface AnalysisProgressProps {
  progress: ProgressResponse | null;
}

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ progress }) => {
  const defaultStages = [
    { key: 'preprocessing', label: 'Image preprocessing', status: 'pending' as const },
    { key: 'detection', label: 'Object/damage detection', status: 'pending' as const },
    { key: 'classification', label: 'Result classification', status: 'pending' as const },
    { key: 'interpretation', label: 'Engineering interpretation', status: 'pending' as const },
  ];

  const stages = progress?.stages || defaultStages;

  return (
    <div aria-live="polite" aria-label="Analysis progress" className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-text">Analyzing Infrastructure...</h2>
      <p className="text-sm text-slate-muted">
        Processing your image through the AI inspection pipeline.
      </p>
      <div className="mt-4 space-y-3">
        {stages.map((stage) => {
          const isDone = stage.status === 'done';
          const isRunning = stage.status === 'running';

          return (
            <div key={stage.key} className="flex items-center gap-3">
              <div className="shrink-0 w-6 h-6 flex items-center justify-center">
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-label="Complete" />
                ) : isRunning ? (
                  <Loader2 className="w-5 h-5 text-brand animate-spin" aria-label="Running" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-300" aria-label="Pending" />
                )}
              </div>
              <span
                className={`text-sm font-medium ${
                  isDone
                    ? 'text-slate-text line-through opacity-60'
                    : isRunning
                    ? 'text-brand'
                    : 'text-slate-400'
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
