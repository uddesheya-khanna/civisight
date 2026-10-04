/**
 * App — root router.
 * Landing is lazy-loaded so Three.js (~800 kB min) is only fetched
 * when the user visits "/", keeping the initial bundle lean.
 */
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Inspect } from './pages/Inspect';
import { Inspections } from './pages/Inspections';
import { InspectionDetail } from './pages/InspectionDetail';
import { Reports } from './pages/Reports';
import { About } from './pages/About';
import { NotFound } from './pages/NotFound';

// Lazy-load the Landing page so Three.js is split into its own chunk
const Landing = lazy(() => import('./pages/Landing').then((m) => ({ default: m.Landing })));

// Minimal fallback shown while the 3D chunk loads
const LazyFallback = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <span className="text-slate-500 text-sm font-mono animate-pulse">Loading…</span>
  </div>
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Suspense fallback={<LazyFallback />}>
              <Landing />
            </Suspense>
          }
        />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/inspect/:module" element={<Inspect />} />
        <Route path="/inspect" element={<Navigate to="/inspect/crack_detection" replace />} />
        <Route path="/inspections" element={<Inspections />} />
        <Route path="/inspections/:analysisId" element={<InspectionDetail />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
