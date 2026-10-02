import { getHistory, deleteHistoryRecord, clearAllHistory } from '../lib/history';
import { HistoryRecord } from '../lib/types';
import { useState, useCallback } from 'react';

interface UseHistoryReturn {
  records: HistoryRecord[];
  refresh: () => void;
  remove: (id: string) => void;
  clearAll: () => void;
}

export function useHistory(): UseHistoryReturn {
  const [records, setRecords] = useState<HistoryRecord[]>(() => getHistory());

  const refresh = useCallback(() => {
    setRecords(getHistory());
  }, []);

  const remove = useCallback((id: string) => {
    deleteHistoryRecord(id);
    setRecords(getHistory());
  }, []);

  const clearAll = useCallback(() => {
    clearAllHistory();
    setRecords([]);
  }, []);

  return { records, refresh, remove, clearAll };
}
