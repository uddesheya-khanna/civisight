import { useState, useCallback, useRef } from 'react';
import { api, ApiClientError } from '../lib/api';
import { AnalysisResult, InspectionType, ProgressResponse } from '../lib/types';
import { saveHistoryRecord } from '../lib/history';

export type AnalysisStep = 'idle' | 'uploading' | 'analyzing' | 'done' | 'error';

interface UseAnalysisReturn {
  step: AnalysisStep;
  progress: ProgressResponse | null;
  result: AnalysisResult | null;
  error: string | null;
  errorCode: string | null;
  analyze: (file: File, inspectionType: InspectionType) => Promise<void>;
  reset: () => void;
}

export function useAnalysis(): UseAnalysisReturn {
  const [step, setStep] = useState<AnalysisStep>('idle');
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef<boolean>(false);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const analyze = useCallback(
    async (file: File, inspectionType: InspectionType) => {
      setStep('uploading');
      setError(null);
      setErrorCode(null);
      setResult(null);
      setProgress(null);
      activeRef.current = true;

      const clientRequestId = crypto.randomUUID().replace(/-/g, '');

      // Start progress polling
      setStep('analyzing');
      pollingRef.current = setInterval(async () => {
        try {
          const prog = await api.getProgress(clientRequestId);
          setProgress(prog);
        } catch {
          // Progress not found yet or expired — keep polling
        }
      }, 300);

      try {
        const analysisResult = await api.analyzeImage(file, inspectionType, clientRequestId);
        stopPolling();

        if (!activeRef.current) return;

        // Save to history
        saveHistoryRecord(analysisResult);

        setResult(analysisResult);
        setStep('done');
      } catch (err) {
        stopPolling();
        if (!activeRef.current) return;

        if (err instanceof ApiClientError) {
          setError(err.message);
          setErrorCode(err.code);
        } else if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('network'))) {
          setError('Cannot reach the CiviSight backend. Make sure the server is running.');
          setErrorCode('NETWORK_ERROR');
        } else {
          setError('Analysis failed. Please try another image.');
          setErrorCode('INFERENCE_FAILED');
        }
        setStep('error');
      }
    },
    [stopPolling],
  );

  const reset = useCallback(() => {
    stopPolling();
    activeRef.current = false;
    setStep('idle');
    setProgress(null);
    setResult(null);
    setError(null);
    setErrorCode(null);
  }, [stopPolling]);

  return { step, progress, result, error, errorCode, analyze, reset };
}
