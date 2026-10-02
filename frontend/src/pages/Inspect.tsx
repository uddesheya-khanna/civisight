import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { DisclaimerBanner } from '../components/layout/DisclaimerBanner';
import { UploadDropzone } from '../components/upload/UploadDropzone';
import { AnalysisProgress } from '../components/analysis/AnalysisProgress';
import { ResultsView } from '../components/results/ResultsView';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { MODULE_DEFINITIONS, getModuleById, ModuleDefinition } from '../lib/modules';
import { InspectionType } from '../lib/types';
import { useAnalysis } from '../hooks/useAnalysis';
import { useBackendHealth } from '../hooks/useBackendHealth';
import { RefreshCw } from 'lucide-react';

export const Inspect: React.FC = () => {
  const { module: routeModule } = useParams<{ module: string }>();
  const navigate = useNavigate();
  const { isOnline } = useBackendHealth();

  // Match or fallback to crack_detection
  const validModule =
    routeModule === 'crack_detection' ||
    routeModule === 'pothole_detection' ||
    routeModule === 'safety_detection'
      ? (routeModule as InspectionType)
      : 'crack_detection';

  const currentDef = getModuleById(validModule);

  const { step, progress, result, error, analyze, reset } = useAnalysis();

  // If user navigates tabs, reset
  const handleTabChange = (modId: InspectionType) => {
    reset();
    navigate(`/inspect/${modId}`);
  };

  const handleStartAnalysis = (file: File) => {
    analyze(file, validModule);
  };

  return (
    <PageShell title={`Inspect — ${currentDef.title}`}>
      <div className="space-y-6 py-6 px-4 sm:px-6 max-w-screen-xl mx-auto">
        <DisclaimerBanner />

        {/* Module Switcher Tabs */}
        {step !== 'done' && (
          <div className="flex border-b border-border space-x-2 overflow-x-auto pb-1">
            {MODULE_DEFINITIONS.map((m: ModuleDefinition) => {
              const isActive = m.id === validModule;
              return (
                <button
                  key={m.id}
                  onClick={() => handleTabChange(m.id as InspectionType)}
                  className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-colors border-b-2 whitespace-nowrap focus:outline-none ${
                    isActive
                      ? 'border-brand text-brand bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {m.title}
                </button>
              );
            })}
          </div>
        )}

        {/* Backend offline warning */}
        {!isOnline && (
          <Alert variant="danger">
            Backend server is currently offline or unreachable. Please verify that the FastAPI backend is running at http://localhost:8000.
          </Alert>
        )}

        {/* Step 1: Upload */}
        {step === 'idle' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-slate-900">{currentDef.title}</h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                {currentDef.description}
              </p>
              <div className="inline-flex items-center gap-3 text-xs text-slate-500 pt-1 font-mono">
                <span>Surface: {currentDef.surface}</span>
                <span>·</span>
                <span>Model: {currentDef.modelPipeline}</span>
              </div>
            </div>

            <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
              <UploadDropzone
                inspectionType={validModule}
                onAnalyze={handleStartAnalysis}
                isAnalyzing={false}
              />
            </div>
          </div>
        )}

        {/* Step 2: Analyzing */}
        {(step === 'uploading' || step === 'analyzing') && (
          <div className="max-w-lg mx-auto py-12">
            <div className="bg-surface p-8 rounded-2xl border border-border shadow-md space-y-6">
              <AnalysisProgress progress={progress} />
              <div className="pt-4 border-t border-border flex justify-end">
                <Button variant="outline" size="sm" onClick={reset}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Error */}
        {step === 'error' && (
          <div className="max-w-xl mx-auto py-8 space-y-4">
            <Alert variant="danger">{error || 'An error occurred during analysis.'}</Alert>
            <div className="flex justify-center gap-3">
              <Button
                variant="primary"
                leftIcon={<RefreshCw className="w-4 h-4" />}
                onClick={reset}
              >
                Try Again
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Return to Dashboard
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Done / Results */}
        {step === 'done' && result && (
          <ResultsView result={result} onInspectAnother={reset} />
        )}
      </div>
    </PageShell>
  );
};
