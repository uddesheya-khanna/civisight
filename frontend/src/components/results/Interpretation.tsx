import React from 'react';
import { FileText } from 'lucide-react';

interface InterpretationProps {
  text: string;
}

export const Interpretation: React.FC<InterpretationProps> = ({ text }) => {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-2">
      <h3 className="text-sm font-semibold text-slate-text flex items-center gap-2">
        <FileText className="w-4 h-4 text-brand" />
        Engineering Visual Interpretation
      </h3>
      <div className="text-sm text-slate-700 leading-relaxed space-y-2">
        {text.split('\n\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
      <p className="text-xs text-slate-muted italic pt-1 border-t border-slate-100">
        Generated deterministically from detected visual features and engineering metrics.
      </p>
    </div>
  );
};
