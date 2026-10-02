import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { ResultsView } from '../components/results/ResultsView';
import { Button } from '../components/ui/Button';
import { getHistoryRecordById } from '../lib/history';
import { AnalysisResult } from '../lib/types';
import { ArrowLeft, Search } from 'lucide-react';

export const InspectionDetail: React.FC = () => {
  const { analysisId } = useParams<{ analysisId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!analysisId) {
      setNotFound(true);
      return;
    }
    const record = getHistoryRecordById(analysisId);
    if (record && record.result) {
      setResult(record.result);
    } else {
      setNotFound(true);
    }
  }, [analysisId]);

  if (notFound) {
    return (
      <PageShell title="Inspection Not Found">
        <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4">
          <Search className="w-12 h-12 text-slate-300 mx-auto" />
          <h1 className="text-xl font-bold text-slate-900">Inspection Not Found</h1>
          <p className="text-sm text-slate-600">
            This inspection may have expired from local browser storage or was run in a different session.
          </p>
          <div className="pt-2">
            <Link to="/inspections">
              <Button variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back to Inspections
              </Button>
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!result) return null;

  return (
    <PageShell title={`Inspection ${analysisId?.slice(0, 8)}`}>
      <div className="py-6 px-4 sm:px-6 max-w-screen-xl mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <Link to="/inspections">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to History
            </Button>
          </Link>
        </div>
        <ResultsView result={result} onInspectAnother={() => navigate(`/inspect/${result.inspection_type}`)} />
      </div>
    </PageShell>
  );
};
