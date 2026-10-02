import React, { useState } from 'react';
import { AnalysisResult } from '../../lib/types';
import { AnnotatedImageViewer } from './AnnotatedImageViewer';
import { FindingsTable } from './FindingsTable';
import { ConditionIndicator } from './ConditionIndicator';
import { SafetyMetrics } from './SafetyMetrics';
import { Interpretation } from './Interpretation';
import { Recommendations } from './Recommendations';
import { NoDetectionState } from './NoDetectionState';
import { SeverityBadge } from '../ui/SeverityBadge';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { DisclaimerBanner } from '../layout/DisclaimerBanner';
import { api } from '../../lib/api';
import {
  Download,
  FileDown,
  RefreshCw,
  Clock,
  Cpu,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from 'lucide-react';

interface ResultsViewProps {
  result: AnalysisResult;
  onInspectAnother: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  result,
  onInspectAnother,
}) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showTimings, setShowTimings] = useState(false);
  const [showLimitations, setShowLimitations] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const {
    analysis_id,
    created_at,
    inspection_type,
    image,
    model,
    summary,
    condition_indicator,
    safety_metrics,
    detections,
    interpretation,
    recommendations,
    limitations,
    warnings,
    timings_ms,
  } = result;

  const hasDetections = detections.length > 0;

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    setDownloadError(null);
    try {
      const blob = await api.downloadReport(analysis_id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `civisight_report_${analysis_id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setDownloadError(e.message || 'Failed to download PDF report.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `civisight_${analysis_id.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const moduleTitles: Record<string, string> = {
    crack_detection: 'Concrete Crack Inspection',
    pothole_detection: 'Asphalt Pothole Inspection',
    safety_detection: 'Site Safety & PPE Inspection',
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Disclaimer */}
      <DisclaimerBanner />

      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-text">
              {moduleTitles[inspection_type] || 'Infrastructure Inspection'}
            </h1>
            {summary.overall_severity && (
              <SeverityBadge severity={summary.overall_severity} size="md" />
            )}
            {model.is_baseline && (
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                Classical Baseline
              </span>
            )}
          </div>
          <p className="text-xs text-slate-muted mt-1 flex items-center gap-1.5 font-mono">
            <span>ID: {analysis_id.slice(0, 8)}</span>
            <span>·</span>
            <span>{new Date(created_at).toLocaleString()}</span>
            <span>·</span>
            <span>{image.original_filename}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={onInspectAnother}
          >
            Inspect Another
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<FileDown className="w-3.5 h-3.5" />}
            onClick={handleExportJson}
          >
            Export JSON
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            isLoading={isDownloadingPdf}
            onClick={handleDownloadPdf}
          >
            Download PDF
          </Button>
        </div>
      </div>

      {downloadError && <Alert variant="danger">{downloadError}</Alert>}

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, idx) => (
            <Alert key={idx} variant="warning">
              <span className="font-medium">{w}</span>
            </Alert>
          ))}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Image Viewer */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-surface p-4 rounded-2xl border border-border shadow-sm">
            <AnnotatedImageViewer
              originalUrl={image.original_url}
              annotatedUrl={image.annotated_url}
              altText={`Analysis view for ${image.original_filename}`}
            />
          </div>

          {/* Model info & Latency Accordion */}
          <div className="bg-surface p-4 rounded-xl border border-border text-xs space-y-3">
            <div className="flex items-center justify-between text-slate-muted">
              <div className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-brand" />
                <span className="font-medium text-slate-700">Model:</span>
                <span className="font-mono">{model.name}</span>
                <span className="text-slate-400">({model.kind})</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Total: {timings_ms.total} ms</span>
              </div>
            </div>

            <button
              onClick={() => setShowTimings((v) => !v)}
              className="flex items-center gap-1 text-brand font-medium hover:underline focus:outline-none"
            >
              <span>{showTimings ? 'Hide latency details' : 'Show latency breakdown'}</span>
              {showTimings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showTimings && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 font-mono text-[11px]">
                <div className="bg-slate-50 p-2 rounded">
                  <span className="text-slate-500 block">Preprocess:</span>
                  <span className="font-semibold text-slate-800">{timings_ms.preprocessing} ms</span>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <span className="text-slate-500 block">Detection:</span>
                  <span className="font-semibold text-slate-800">{timings_ms.detection} ms</span>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <span className="text-slate-500 block">Classification:</span>
                  <span className="font-semibold text-slate-800">{timings_ms.classification} ms</span>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <span className="text-slate-500 block">Interpretation:</span>
                  <span className="font-semibold text-slate-800">{timings_ms.interpretation} ms</span>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <span className="text-slate-500 block">Annotation:</span>
                  <span className="font-semibold text-slate-800">{timings_ms.annotation} ms</span>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <span className="text-slate-500 block">Overall Total:</span>
                  <span className="font-semibold text-brand">{timings_ms.total} ms</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Data, Findings, Recommendations */}
        <div className="lg:col-span-5 space-y-4">
          {!hasDetections ? (
            <NoDetectionState />
          ) : (
            <>
              {/* Condition Indicator */}
              <ConditionIndicator indicator={condition_indicator} />

              {/* Safety metrics if safety inspection */}
              {inspection_type === 'safety_detection' && (
                <SafetyMetrics metrics={safety_metrics ?? null} />
              )}

              {/* Findings Table */}
              <div className="bg-surface p-4 rounded-xl border border-border shadow-sm">
                <FindingsTable
                  detections={detections}
                  inspectionType={inspection_type}
                  selectedId={selectedId}
                  onSelectDetection={setSelectedId}
                />
              </div>
            </>
          )}

          {/* Interpretation */}
          <Interpretation text={interpretation} />

          {/* Recommendations */}
          <Recommendations recommendations={recommendations} />

          {/* Limitations Accordion */}
          <div className="bg-surface p-4 rounded-xl border border-border space-y-2">
            <button
              onClick={() => setShowLimitations((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                Technical & Inspection Limitations ({limitations.length})
              </span>
              {showLimitations ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showLimitations && (
              <ul className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-muted">
                {limitations.map((lim, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-slate-400">•</span>
                    <span>{lim}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
