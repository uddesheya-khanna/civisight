import { HistoryRecord, AnalysisResult } from './types';

const STORAGE_KEY = 'civisight.history.v1';
const MAX_RECORDS = 50;

export function getHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.warn('Failed to read inspection history from localStorage:', err);
    return [];
  }
}

export function saveHistoryRecord(result: AnalysisResult): HistoryRecord {
  const record: HistoryRecord = {
    analysis_id: result.analysis_id,
    created_at: result.created_at,
    inspection_type: result.inspection_type,
    filename: result.image.original_filename,
    total_detections: result.summary.total_detections,
    condition_value: result.condition_indicator.value,
    overall_severity: result.summary.overall_severity,
    summary: result.interpretation,
    result: result,
  };

  try {
    const list = getHistory();
    // Prepend new record, filter out existing with same ID
    const updated = [record, ...list.filter((r) => r.analysis_id !== record.analysis_id)].slice(
      0,
      MAX_RECORDS,
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save inspection record to localStorage:', err);
  }

  return record;
}

export function getHistoryRecordById(analysisId: string): HistoryRecord | null {
  const list = getHistory();
  return list.find((r) => r.analysis_id === analysisId) || null;
}

export function deleteHistoryRecord(analysisId: string): void {
  try {
    const list = getHistory();
    const updated = list.filter((r) => r.analysis_id !== analysisId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to delete inspection record from localStorage:', err);
  }
}

export function clearAllHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear inspection history:', err);
  }
}

export function markReportGenerated(analysisId: string): void {
  try {
    const list = getHistory();
    const now = new Date().toISOString();
    const updated = list.map((r) =>
      r.analysis_id === analysisId ? { ...r, report_generated_at: now } : r,
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to update report timestamp in history:', err);
  }
}
