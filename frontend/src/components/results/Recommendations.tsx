import React from 'react';
import { RecommendationItem } from '../../lib/types';
import { ClipboardList, ArrowRight } from 'lucide-react';

interface RecommendationsProps {
  recommendations: (RecommendationItem | string)[];
}

export const Recommendations: React.FC<RecommendationsProps> = ({ recommendations }) => {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
      <h3 className="text-sm font-semibold text-slate-text flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-brand" />
        Recommended Engineering Actions
      </h3>
      <ul className="space-y-2 text-sm text-slate-700">
        {recommendations.map((rec, idx) => {
          const text = typeof rec === 'string' ? rec : rec.text;
          const level = typeof rec === 'object' && rec.level ? rec.level : null;

          return (
            <li key={idx} className="flex items-start gap-2.5">
              <ArrowRight className="w-4 h-4 text-brand shrink-0 mt-0.5" />
              <span>
                {level && (
                  <span className="font-semibold capitalize text-slate-900 mr-1.5">
                    [{level}]
                  </span>
                )}
                {text}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-slate-muted italic pt-1 border-t border-slate-100">
        Recommendations are preliminary guidance based on visual observation heuristics.
      </p>
    </div>
  );
};
