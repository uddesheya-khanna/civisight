import React from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-border mt-auto">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-muted">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand" />
            <span className="font-medium text-slate-text">CiviSight AI</span>
            <span>— AI-Powered Infrastructure Inspection</span>
          </div>
          <div className="text-center sm:text-right space-y-1">
            <p>Academic prototype · Not for professional engineering decisions</p>
            <p>
              Models: Ultralytics YOLO (
              <a
                href="https://github.com/ultralytics/ultralytics"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline"
              >
                AGPL-3.0
              </a>
              ) · OpenCV ·{' '}
              <Link to="/about" className="text-brand hover:underline">
                About
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
