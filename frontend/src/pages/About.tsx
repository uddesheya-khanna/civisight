import React from 'react';
import { PageShell } from '../components/layout/PageShell';
import { DisclaimerBanner } from '../components/layout/DisclaimerBanner';
import {
  Info,
  BookOpen,
  Cpu,
  Layers,
  Calculator,
  ShieldAlert,
  Code2,
} from 'lucide-react';

export const About: React.FC = () => {
  return (
    <PageShell title="About & Methodology">
      <div className="space-y-10 py-6 px-4 sm:px-6 max-w-screen-xl mx-auto text-slate-800">
        <DisclaimerBanner />

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-brand" />
            About CiviSight AI & Methodology
          </h1>
          <p className="text-base text-slate-600">
            Transparent architectural documentation, mathematical formulas, and computer vision methodology.
          </p>
        </div>

        {/* 1. Academic Prototype Statement */}
        <section className="bg-surface p-6 rounded-2xl border border-border space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Info className="w-5 h-5 text-brand" />
            Academic Prototype Statement
          </h2>
          <div className="text-sm text-slate-600 space-y-2 leading-relaxed">
            <p>
              CiviSight AI is an academic engineering prototype designed to explore and demonstrate the practical integration of modern computer vision (YOLOv8 deep learning and classical ridge filters) with deterministic civil engineering heuristics.
            </p>
            <p className="font-medium text-slate-800">
              The application provides preliminary visual observations only. It does NOT perform structural load calculations, material science evaluations, geotechnical safety assessments, or legally binding site safety audits.
            </p>
          </div>
        </section>

        {/* 2. Pipeline Methodology */}
        <section className="bg-surface p-6 rounded-2xl border border-border space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand" />
            Computer Vision & Engineering Pipeline
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-900 text-sm">Deep Learning + Classical CV Integration</h3>
              <p className="text-slate-600 leading-relaxed">
                Rather than treating all visual tasks identically, CiviSight utilizes specialized pipelines:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li><strong>Concrete Cracks:</strong> Evaluated via a multi-scale Sato ridge filter (Hessian matrix eigenvalues), CLAHE, and hysteresis thresholding, serving as an honest classical baseline when specialized segmentation weights are uncalibrated.</li>
                <li><strong>Asphalt Potholes:</strong> Evaluated via specialized YOLOv8 object detection with bounding box normalization and relative area estimation.</li>
                <li><strong>Site Safety:</strong> Dual-detector pipeline pairing standard COCO person detection with a specialized hard-hat detector, joined by a deterministic geometric association algorithm.</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-900 text-sm">Why Relative Metrics (Area Ratio)?</h3>
              <p className="text-slate-600 leading-relaxed">
                In uncalibrated single 2D images, pixel counts vary wildly based on camera distance, lens focal length, and sensor resolution. Physical dimensions (e.g., "30 cm pothole" or "2 mm crack") cannot be determined without physical fiducial markers or stereoscopic depth.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Therefore, CiviSight relies exclusively on scale-invariant relative metrics:
                <code>area_ratio = target_area / total_image_area</code>.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Mathematical Condition Indicator Formulas */}
        <section className="bg-surface p-6 rounded-2xl border border-border space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-brand" />
            Visual Condition Indicator Formulas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Defect formula */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 font-mono">
              <h3 className="font-bold text-slate-900 font-sans text-sm">Defect Indicator: defect_v1</h3>
              <div className="bg-white p-3 rounded border border-slate-200 text-slate-800">
                score = 100 - (P_high + P_mod + P_low + P_area)
              </div>
              <ul className="space-y-1.5 text-slate-600 font-sans text-[11px]">
                <li>• <strong>High-severity penalty:</strong> min(30, count_high × 12.0)</li>
                <li>• <strong>Moderate-severity penalty:</strong> min(20, count_mod × 5.0)</li>
                <li>• <strong>Low-severity penalty:</strong> min(10, count_low × 2.0)</li>
                <li>• <strong>Area coverage penalty:</strong> min(25, total_area_ratio × 500)</li>
                <li>• <em>Baseline cap:</em> When classical baseline is active, max score is capped at 85 to reflect heuristic uncertainty.</li>
              </ul>
            </div>

            {/* Safety formula */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 font-mono">
              <h3 className="font-bold text-slate-900 font-sans text-sm">Safety Indicator: safety_v1</h3>
              <div className="bg-white p-3 rounded border border-slate-200 text-slate-800">
                score = round(compliance_rate × 100) - P_unprotected
              </div>
              <ul className="space-y-1.5 text-slate-600 font-sans text-[11px]">
                <li>• <strong>Base score:</strong> 100% visible compliance = 100 base score</li>
                <li>• <strong>Unprotected worker penalty:</strong> min(30, count_unprotected × 15)</li>
                <li>• <strong>Person-only mode:</strong> If helmet model is disabled, defaults to 50 (neutral observation indicator).</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 4. Model Cards & Attribution */}
        <section className="bg-surface p-6 rounded-2xl border border-border space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-brand" />
            Model Registry & Attribution
          </h2>
          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-border text-slate-muted uppercase font-medium">
                <tr>
                  <th className="py-2.5 px-3">Module</th>
                  <th className="py-2.5 px-3">Model / Method</th>
                  <th className="py-2.5 px-3">Weights / Source</th>
                  <th className="py-2.5 px-3">Input</th>
                  <th className="py-2.5 px-3">License</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-slate-700">
                <tr>
                  <td className="py-2.5 px-3 font-medium">Concrete Crack</td>
                  <td className="py-2.5 px-3">Classical Sato Ridge + CLAHE</td>
                  <td className="py-2.5 px-3 font-mono">scikit-image / OpenCV</td>
                  <td className="py-2.5 px-3 font-mono">Max 1280px</td>
                  <td className="py-2.5 px-3">BSD / Apache-2.0</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium">Asphalt Pothole</td>
                  <td className="py-2.5 px-3">YOLOv8n Object Detection</td>
                  <td className="py-2.5 px-3 font-mono">pothole_yolo.pt</td>
                  <td className="py-2.5 px-3 font-mono">640px</td>
                  <td className="py-2.5 px-3">AGPL-3.0</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium">Site Safety (People)</td>
                  <td className="py-2.5 px-3">YOLOv8n (COCO person)</td>
                  <td className="py-2.5 px-3 font-mono">yolov8n.pt</td>
                  <td className="py-2.5 px-3 font-mono">960px</td>
                  <td className="py-2.5 px-3">AGPL-3.0</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium">Site Safety (Helmets)</td>
                  <td className="py-2.5 px-3">YOLOv8n Hard-Hat Detection</td>
                  <td className="py-2.5 px-3 font-mono">helmet_yolo.pt</td>
                  <td className="py-2.5 px-3 font-mono">960px</td>
                  <td className="py-2.5 px-3">AGPL-3.0</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. Complete Disclaimers & Limitations */}
        <section className="bg-surface p-6 rounded-2xl border border-border space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            Limitations & Engineering Disclaimers
          </h2>
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 text-xs text-slate-700 space-y-2 leading-relaxed">
            <p className="font-semibold text-slate-900">
              CiviSight AI provides AI-assisted preliminary visual observations and does not replace professional engineering inspection or structural assessment.
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>No depth, scale, or material data can be obtained from single 2D uncalibrated imagery.</li>
              <li>Atmospheric conditions, lighting, severe shadows, and surface occlusions heavily impact detection performance.</li>
              <li>A result indicating no detection does NOT confirm that the structure or site is defect-free.</li>
              <li>All severity ratings and condition indicators are visual heuristics and must be verified by licensed professional engineers.</li>
            </ul>
          </div>
        </section>

        {/* 6. Technology Stack & Licensing */}
        <section className="bg-surface p-6 rounded-2xl border border-border space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Code2 className="w-5 h-5 text-brand" />
            Technology Stack & Open Source Attribution
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
            <div>
              <strong className="text-slate-800 block mb-1">Backend Stack:</strong>
              <p>Python 3.11, FastAPI, Uvicorn, PyTorch (CPU), Ultralytics YOLOv8, OpenCV Headless, scikit-image, scipy, ReportLab, Pydantic.</p>
            </div>
            <div>
              <strong className="text-slate-800 block mb-1">Frontend Stack:</strong>
              <p>React 18, Vite, TypeScript, Tailwind CSS, Lucide React, react-zoom-pan-pinch.</p>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
};
