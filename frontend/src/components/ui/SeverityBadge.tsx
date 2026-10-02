import React from 'react';
import { SeverityLevel } from '../../lib/types';
import { AlertTriangle, AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface SeverityBadgeProps {
  severity: SeverityLevel | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  if (!severity) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-severity-gray-bg text-severity-gray-text border border-severity-gray-border ${
          size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'
        } ${className}`}
      >
        {showIcon && <Info className="w-3.5 h-3.5 shrink-0" />}
        <span>None</span>
      </span>
    );
  }

  const config = {
    low: {
      label: 'Low Concern',
      shortLabel: 'Low',
      bg: 'bg-severity-low-bg',
      text: 'text-severity-low-text',
      border: 'border-severity-low-border',
      icon: CheckCircle2,
    },
    moderate: {
      label: 'Moderate Concern',
      shortLabel: 'Moderate',
      bg: 'bg-severity-moderate-bg',
      text: 'text-severity-moderate-text',
      border: 'border-severity-moderate-border',
      icon: AlertCircle,
    },
    high: {
      label: 'High Concern',
      shortLabel: 'High',
      bg: 'bg-severity-high-bg',
      text: 'text-severity-high-text',
      border: 'border-severity-high-border',
      icon: AlertTriangle,
    },
  }[severity];

  const IconComp = config.icon;
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      {showIcon && <IconComp className={size === 'lg' ? 'w-4 h-4 shrink-0' : 'w-3.5 h-3.5 shrink-0'} />}
      <span>{size === 'sm' ? config.shortLabel : config.label}</span>
    </span>
  );
};
