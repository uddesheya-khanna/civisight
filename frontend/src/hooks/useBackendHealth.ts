import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { HealthResponse } from '../lib/types';

export function useBackendHealth() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const data = await api.getHealth();
      setHealth(data);
      setIsOnline(true);
      setError(null);
    } catch (err: unknown) {
      setIsOnline(false);
      setError(err instanceof Error ? err.message : 'Backend offline');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    // Poll every 30 seconds
    const timer = setInterval(checkHealth, 30000);
    return () => clearInterval(timer);
  }, [checkHealth]);

  return { health, isOnline, isLoading, error, refetch: checkHealth };
}
