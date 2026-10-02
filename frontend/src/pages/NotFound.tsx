import React from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { Compass, ArrowLeft } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <PageShell title="Page Not Found">
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <Compass className="w-12 h-12 text-slate-300 mx-auto" />
        <h1 className="text-3xl font-extrabold text-slate-900">404</h1>
        <p className="text-base font-medium text-slate-700">Page not found</p>
        <p className="text-xs text-slate-500">
          The requested inspection or route does not exist.
        </p>
        <div className="pt-2">
          <Link to="/dashboard">
            <Button variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </PageShell>
  );
};
