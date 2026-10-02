import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const NoDetectionState: React.FC = () => {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 space-y-3 text-center">
      <div className="flex justify-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-slate-400" />
        </div>
      </div>
      <h3 className="text-base font-semibold text-slate-text">
        No significant target was detected.
      </h3>
      <div className="space-y-2 text-sm text-slate-muted max-w-md mx-auto">
        <p>Try a clearer image with better lighting and a closer view.</p>
        <p className="font-medium text-slate-700">
          This result does not confirm that the surface or site is free of defects.
        </p>
      </div>
    </div>
  );
};
