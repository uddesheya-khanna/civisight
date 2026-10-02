import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface DisclaimerBannerProps {
  compact?: boolean;
  className?: string;
}

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({
  compact = false,
  className = '',
}) => {
  return (
    <div
      role="region"
      aria-label="Engineering disclaimer"
      className={`rounded-xl border border-slate-200 bg-slate-50 text-slate-muted ${
        compact ? 'p-3 text-xs' : 'p-4 text-xs sm:text-sm'
      } ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0" />
        <p className="leading-relaxed">
          <strong className="text-slate-text font-medium">Notice:</strong> CiviSight AI provides
          AI-assisted preliminary visual observations and does not replace professional engineering
          inspection or structural assessment.
        </p>
      </div>
    </div>
  );
};
