import { SeverityLevel } from './types';

export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function formatPercent(val: number | null | undefined, decimals: number = 1): string {
  if (val === null || val === undefined) return 'N/A';
  return `${val.toFixed(decimals)}%`;
}

export function formatSeverityText(severity: SeverityLevel | null | undefined): string {
  if (!severity) return 'None';
  switch (severity) {
    case 'low':
      return 'Low';
    case 'moderate':
      return 'Moderate';
    case 'high':
      return 'High';
    default:
      return String(severity);
  }
}

export function getScoreLabel(scoreType: string): string {
  return scoreType === 'heuristic_score' ? 'Detection score (heuristic)' : 'Confidence';
}
