import React from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { DisclaimerBanner } from '../components/layout/DisclaimerBanner';
import { Button } from '../components/ui/Button';
import { MODULE_DEFINITIONS, ModuleDefinition } from '../lib/modules';
import {
  ShieldCheck,
  CheckCircle,
  FileSpreadsheet,
  ArrowRight,
  Layers,
} from 'lucide-react';

export const Landing: React.FC = () => {
  return (
    <PageShell title="Home">
      <div className="space-y-16 py-8 px-4 sm:px-6 max-w-screen-xl mx-auto">
        <DisclaimerBanner />

        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto space-y-6 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-light text-brand text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            Civil Infrastructure Vision Prototype
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            AI-Powered Infrastructure Inspection & Defect Analysis
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Automated visual defect detection and engineering-grounded condition assessment
            for civil infrastructure.
          </p>
          <div className="flex items-center justify-center gap-4 pt-2 flex-wrap">
            <Link to="/dashboard">
              <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Open Dashboard
              </Button>
            </Link>
            <Link to="/inspect/crack_detection">
              <Button size="lg" variant="outline">
                Try Sample Inspection
              </Button>
            </Link>
          </div>
        </section>

        {/* 3 Core Value Propositions */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-surface border border-border space-y-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Engineering-Grounded</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Rule-based severity classification, relative geometric metrics, condition indicators,
              and deterministic recommendations — not black-box scores.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface border border-border space-y-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Honest AI</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Clearly distinguishes deep learning models from classical CV baselines; labels heuristic scores honestly; flags low-confidence detections; never claims "safe".
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface border border-border space-y-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Auditable & Transparent</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              PDF inspection reports with visual findings, complete JSON export, full methodology documentation, and transparent model cards.
            </p>
          </div>
        </section>

        {/* 3 Inspection Modules */}
        <section className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">Inspection Modules</h2>
            <p className="text-sm text-slate-600">
              Select an infrastructure component to inspect with our specialized computer vision models.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MODULE_DEFINITIONS.map((m: ModuleDefinition) => (
              <div
                key={m.id}
                className="bg-surface border border-border rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-sm hover:border-brand transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {m.targetDefect}
                    </span>
                    <span className="text-xs font-medium text-slate-500">{m.surface}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{m.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{m.description}</p>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="text-xs space-y-1.5 text-slate-500">
                    <p>
                      <strong className="text-slate-700">Model:</strong> {m.modelPipeline}
                    </p>
                    <p>
                      <strong className="text-slate-700">Output:</strong> {m.metricsOutput}
                    </p>
                  </div>
                  <Link to={`/inspect/${m.id}`} className="block">
                    <Button variant="primary" className="w-full">
                      Launch Inspection
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pipeline Architecture Flow */}
        <section className="bg-slate-50 border border-border rounded-2xl p-8 space-y-6">
          <div className="text-center max-w-lg mx-auto space-y-2">
            <h2 className="text-xl font-bold text-slate-900">Inspection Pipeline Architecture</h2>
            <p className="text-xs text-slate-500">
              Structured multi-stage execution ensuring reliability, traceability, and engineering rigor.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-center">
            <div className="bg-surface p-4 rounded-xl border border-border space-y-1">
              <span className="text-xs font-mono font-bold text-brand block">01</span>
              <p className="text-xs font-bold text-slate-800">Upload & EXIF</p>
              <p className="text-[11px] text-slate-500">Magic bytes, validation, re-encode</p>
            </div>
            <div className="bg-surface p-4 rounded-xl border border-border space-y-1">
              <span className="text-xs font-mono font-bold text-brand block">02</span>
              <p className="text-xs font-bold text-slate-800">CV / AI Engine</p>
              <p className="text-[11px] text-slate-500">YOLO or Sato ridge baseline</p>
            </div>
            <div className="bg-surface p-4 rounded-xl border border-border space-y-1">
              <span className="text-xs font-mono font-bold text-brand block">03</span>
              <p className="text-xs font-bold text-slate-800">Engineering Rules</p>
              <p className="text-[11px] text-slate-500">Severity, extent, grid location</p>
            </div>
            <div className="bg-surface p-4 rounded-xl border border-border space-y-1">
              <span className="text-xs font-mono font-bold text-brand block">04</span>
              <p className="text-xs font-bold text-slate-800">Condition Score</p>
              <p className="text-[11px] text-slate-500">0–100 heuristic indicator</p>
            </div>
            <div className="bg-surface p-4 rounded-xl border border-border space-y-1">
              <span className="text-xs font-mono font-bold text-brand block">05</span>
              <p className="text-xs font-bold text-slate-800">Report & Export</p>
              <p className="text-[11px] text-slate-500">Auditable PDF & raw JSON</p>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
};
