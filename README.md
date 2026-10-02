# CiviSight AI — AI-Powered Infrastructure Inspection & Defect Analysis

[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5+-646CFF.svg)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4+-38B2AC.svg)](https://tailwindcss.com)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-purple.svg)](https://ultralytics.com)

CiviSight AI is an academic engineering prototype integrating trained deep learning models (YOLOv8) with classical computer vision and deterministic civil engineering heuristics for automated visual infrastructure defect analysis.

---

> **Engineering Disclaimer**
> CiviSight AI provides AI-assisted preliminary visual observations and does not replace professional engineering inspection or structural assessment. Results reflect surface observations from 2D uncalibrated imagery only.

---

## Key Capabilities

1. **Concrete Crack Detection (Module A)**
   - Primary: YOLOv8n-seg instance segmentation model (`crack_yolo.pt`) trained on the Ultralytics `crack-seg` dataset (100 epochs, `OpenSistemas/YOLOv8-crack-seg`).
   - Fallback: classical multi-scale Sato ridge filter (Hessian matrix eigenvalues, CLAHE, hysteresis thresholding) — activates automatically if model weights are absent.
   - Scale-invariant relative length and damage area ratio calculations.

2. **Asphalt Pothole Detection (Module B)**
   - YOLOv8 detection model (`pothole_yolo.pt`, `peterhdd/pothole-detection-yolov8`).
   - 9-quadrant spatial discretization and relative surface footprint metrics.

3. **Site Safety & PPE Observation (Module C)**
   - Dual-detector architecture: COCO `yolov8n` person detector + `helmet_yolo.pt` hard-hat model (`keremberke/yolov8n-hard-hat-detection`).
   - Deterministic geometric head-region association algorithm.
   - Visible PPE compliance rate and assessability thresholds.

4. **Deterministic Engineering Assessment**
   - 0–100 Visual Condition Indicators with full penalty breakdowns.
   - Rule-based severity classification (`low`, `moderate`, `high`).
   - Code-grounded recommendations and transparent technical limitations.

5. **Full-Stack & Auditable**
   - ReportLab PDF inspection report builder.
   - Interactive zoom/pan/pinch defect inspection viewer.
   - Client-side history storage and JSON export.

---

## Project Structure

```
civisight/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI routers (health, analyze, files, report)
│   │   ├── core/            # Validation, errors, atomic storage, progress
│   │   ├── cv/              # Preprocessing, detectors, annotation, registry
│   │   ├── engineering/     # Severity, metrics, condition formulas, safety
│   │   ├── services/        # Inference orchestrator, ReportLab PDF builder
│   │   └── tests/           # Pytest unit and integration test suite
│   ├── models/              # registry.yaml + MODEL_CARD.md (weights downloaded separately)
│   └── scripts/             # Model download, training, and E2E smoke test scripts
├── frontend/
│   ├── public/sample-data/  # Real Wikimedia inspection sample images
│   └── src/
│       ├── components/      # UI components, layout, viewer, results panels
│       ├── hooks/           # useAnalysis, useHistory, useBackendHealth
│       ├── lib/             # API client, types, modules, formatters
│       └── pages/           # Landing, Dashboard, Inspect, Detail, History, Reports, About
├── docs/                    # Architecture, API, Methodology, Viva notes, Model cards
├── CIVISIGHT_AI_PRD.md      # Full Product Requirements Document
└── README.md
```

---

## Quick Start

### 1. Prerequisites

- Python 3.11
- Node.js 18+ and npm

### 2. Backend Setup

```bash
# From repo root
python -m venv backend/venv

# Activate (Windows)
backend\venv\Scripts\activate
# Activate (Linux/macOS)
source backend/venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Download model weights (required — not included in repo due to file size)
python backend/scripts/download_models.py
# Crack model (YOLOv8n-seg, downloads from HuggingFace automatically):
python backend/scripts/train_crack_model.py
```

### 3. Configure Environment

```bash
# Copy example env files and edit if needed
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 4. Start Backend

```bash
python -m uvicorn backend.app.main:app --port 8000
```

- Health check: `http://localhost:8000/api/health`
- OpenAPI docs: `http://localhost:8000/docs`

### 5. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

---

## Model Weights

> Model weight files (`*.pt`) are **not committed to Git** — they are large binary files (6–22 MB each).

| Model File | Source | Purpose |
|---|---|---|
| `crack_yolo.pt` | `OpenSistemas/YOLOv8-crack-seg` (HuggingFace) | Primary crack detector |
| `pothole_yolo.pt` | `peterhdd/pothole-detection-yolov8` (HuggingFace) | Pothole detector |
| `helmet_yolo.pt` | `keremberke/yolov8n-hard-hat-detection` (HuggingFace) | Hard hat detector |
| `yolov8n.pt` | Ultralytics (auto-downloaded) | Person detector |

**Re-acquire all weights:**
```bash
python backend/scripts/download_models.py      # pothole + helmet + yolov8n
python backend/scripts/train_crack_model.py    # crack_yolo.pt (HuggingFace)
```

---

## Running Tests

```bash
# Unit & integration tests (11 tests)
python -m pytest backend/app/tests -v

# End-to-end smoke test (requires backend running on :8000)
python backend/scripts/e2e_smoke.py
```

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | System status, model load state, device info |
| `/api/analyze` | POST | Run inspection (form: `image`, `inspection_type`) |
| `/api/images/{id}/original` | GET | Retrieve original uploaded image |
| `/api/images/{id}/annotated` | GET | Retrieve annotated output image |
| `/api/report/{analysis_id}` | POST | Generate and download PDF report |
| `/api/progress/{client_request_id}` | GET | SSE progress stream |

Full API documentation: [`docs/API.md`](docs/API.md)

---

## Documentation

| Document | Description |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture and data flow |
| [`docs/API.md`](docs/API.md) | Full API reference |
| [`docs/ENGINEERING_METHODOLOGY.md`](docs/ENGINEERING_METHODOLOGY.md) | CV algorithms and engineering formulas |
| [`docs/VIVA_NOTES.md`](docs/VIVA_NOTES.md) | Design decisions and Q&A preparation |
| [`backend/models/MODEL_CARD.md`](backend/models/MODEL_CARD.md) | Model sources, training data, and limitations |

---

## Model Attribution & Licenses

- **YOLOv8 / Ultralytics:** AGPL-3.0 License
- **OpenSistemas/YOLOv8-crack-seg:** Open Academic (HuggingFace)
- **keremberke/yolov8n-hard-hat-detection:** MIT License
- **peterhdd/pothole-detection-yolov8:** Open Academic (HuggingFace)
- **OpenCV:** Apache-2.0 License
- **scikit-image:** BSD 3-Clause License
- **Sample Images:** Wikimedia Commons — Creative Commons licenses (see [`frontend/public/sample-data/ATTRIBUTION.md`](frontend/public/sample-data/ATTRIBUTION.md))
