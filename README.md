# CiviSight AI — AI-Powered Infrastructure Inspection

[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev)
[![Vite 5](https://img.shields.io/badge/Vite-5+-646CFF.svg)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4+-38B2AC.svg)](https://tailwindcss.com)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-purple.svg)](https://ultralytics.com)

CiviSight AI is an academic engineering prototype that integrates trained YOLOv8 deep-learning models with classical computer vision and deterministic civil-engineering heuristics for automated visual infrastructure defect analysis.

> **Engineering Disclaimer**  
> CiviSight provides AI-assisted preliminary visual observations only.  
> It does not replace professional engineering inspection or structural assessment.  
> Results reflect surface observations from 2D uncalibrated imagery.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Prerequisites](#prerequisites)
4. [Backend Setup](#backend-setup)
5. [Frontend Setup](#frontend-setup)
6. [Running Both Services](#running-both-services)
7. [Model Weights](#model-weights)
8. [Environment Variables](#environment-variables)
9. [Running Tests](#running-tests)
10. [Building for Production](#building-for-production)
11. [API Reference](#api-reference)
12. [Troubleshooting](#troubleshooting)
13. [Documentation](#documentation)
14. [Capabilities](#capabilities)
15. [Attributions](#attributions)

---

## Quick Start

> **All commands run from the repository root** (`civisight/`) unless otherwise noted.

**Terminal 1 — Backend:**

```bash
# Windows (PowerShell)
backend\venv\Scripts\activate
python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000

# Windows (Git Bash)
source backend/venv/Scripts/activate
python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000

# macOS / Linux
source backend/venv/bin/activate
python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Health check | http://localhost:8000/api/health |
| OpenAPI docs | http://localhost:8000/docs |

---

## Project Structure

```
civisight/                          ← repo root — run all commands from here
├── backend/
│   ├── app/
│   │   ├── api/                    FastAPI routers (health, analyze, files, report)
│   │   ├── core/                   Validation, error handling, storage, progress
│   │   ├── cv/                     Image preprocessing, detectors, annotation, registry
│   │   ├── engineering/            Severity, metrics, condition formulas, safety logic
│   │   ├── services/               Inference orchestrator, ReportLab PDF builder
│   │   ├── tests/                  Pytest unit and integration suite (11 tests)
│   │   ├── config.py               Pydantic settings (reads backend/.env)
│   │   ├── main.py                 FastAPI application factory
│   │   └── schemas.py              Pydantic request/response models
│   ├── datasets/                   Dataset documentation
│   ├── models/                     Model registry YAML + MODEL_CARD.md
│   │                               (weights downloaded separately — see Model Weights)
│   ├── scripts/                    Model download, training, E2E smoke test
│   ├── storage/                    Auto-created at runtime — uploaded/annotated images
│   ├── venv/                       Python virtual environment (git-ignored)
│   ├── .env                        Environment overrides (git-ignored)
│   ├── .env.example                Template — copy to .env and edit
│   └── requirements.txt            Python dependencies
├── frontend/
│   ├── public/
│   │   ├── hero-bridge.jpg         Landing page hero image
│   │   ├── concrete-surface.jpg    Landing page surface image
│   │   └── sample-data/            Wikimedia Commons sample inspection images
│   ├── src/
│   │   ├── components/             UI components, layout, 3D, results panels
│   │   ├── hooks/                  useAnalysis, useHistory, useBackendHealth, useScrollProgress
│   │   ├── lib/                    API client, types, module definitions, formatters
│   │   └── pages/                  Landing, Dashboard, Inspect, Detail, Inspections, Reports, About
│   ├── package.json
│   └── vite.config.ts              Dev server + /api proxy → http://localhost:8000
├── docs/                           Architecture, API, methodology, viva notes
├── Makefile                        Dev convenience targets (make backend / frontend / test)
├── start.ps1                       PowerShell equivalent of Makefile
├── .gitignore
└── README.md
```

> **Why all Python commands run from repo root:**  
> Internal imports are written as `from backend.app.config import settings`.  
> Python's module resolution requires the repo root to be on `sys.path`,  
> which happens automatically when you run `python -m ...` from the repo root.

---

## Prerequisites

| Tool | Minimum version | Notes |
|---|---|---|
| Python | 3.11 | 3.10 may work; 3.12+ not tested |
| Node.js | 18 | Required for the React frontend |
| npm | 9 | Bundled with Node.js 18+ |
| Git | Any | To clone the repo |

---

## Backend Setup

### 1. Create the virtual environment

```bash
# From repo root
python -m venv backend/venv
```

### 2. Activate

```bash
# Windows — PowerShell
backend\venv\Scripts\activate

# Windows — Git Bash
source backend/venv/Scripts/activate

# macOS / Linux
source backend/venv/bin/activate
```

### 3. Install Python dependencies

```bash
pip install -r backend/requirements.txt
```

### 4. Copy the environment file

```bash
# Windows
copy backend\.env.example backend\.env

# macOS / Linux
cp backend/.env.example backend/.env
```

Edit `backend/.env` if you need non-default ports or settings.

### 5. Download model weights

Model weight files (`*.pt`) are **not committed to Git** due to file size.

```bash
# Download pothole, helmet, and base YOLO weights
python backend/scripts/download_models.py

# Fine-tuned crack-detection weight (downloads from HuggingFace)
python backend/scripts/train_crack_model.py
```

See [Model Weights](#model-weights) for details.

---

## Frontend Setup

```bash
cd frontend
npm install
```

No `.env` file is required for the frontend in development —  
the Vite proxy automatically forwards `/api/*` requests to `http://localhost:8000`.

---

## Running Both Services

Run each in a separate terminal, both starting from the repo root.

**Terminal 1 — Backend API:**

```bash
# Activate venv first (if not already active)
# Windows PowerShell:  backend\venv\Scripts\activate
# Windows Git Bash:    source backend/venv/Scripts/activate
# macOS/Linux:         source backend/venv/bin/activate

python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend dev server:**

```bash
cd frontend
npm run dev
```

### Using the convenience scripts (optional)

If you have `make` available (Git Bash, WSL, macOS, Linux):

```bash
make backend    # Terminal 1
make frontend   # Terminal 2
make test       # Run backend tests
make build      # Production build
```

If you prefer PowerShell:

```powershell
.\start.ps1 backend    # Terminal 1
.\start.ps1 frontend   # Terminal 2
.\start.ps1 test
.\start.ps1 build
```

---

## Production Deployment — Free Tier ($0 / ₹0)

### Architecture

```
GitHub
  ├─→ Vercel Hobby   — React/Vite frontend (static SPA)
  └─→ Render Free    — FastAPI backend + AI/CV inference
```

No database. No paid storage. No paid APIs. No GPU required.

### 1. Render — Backend

**Repository:** connect your GitHub repo in the Render dashboard.

| Setting | Value |
|---|---|
| Runtime | Python 3.11 |
| Build command | `pip install -r backend/requirements.txt && python backend/scripts/download_deploy_models.py` |
| Start command | `python -m uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT --workers 1` |
| Health check path | `/api/health` |
| Plan | **Free** |

> The build command downloads all required model weights from public HuggingFace and Ultralytics sources.  
> It **never** trains a model. It is safe to re-run on every deploy.

**Environment variables — set in Render dashboard:**

| Variable | Value |
|---|---|
| `APP_ENV` | `production` |
| `CORS_ORIGINS` | `http://localhost:5173,https://your-app.vercel.app` |
| `MAX_CONCURRENT_INFERENCES` | `1` |
| `OMP_NUM_THREADS` | `1` |
| `MKL_NUM_THREADS` | `1` |
| All others | safe defaults from `backend/.env.example` |

> **Cold starts:** Render Free instances sleep after ~15 minutes of inactivity.  
> The first request after a sleep may take 30–60 seconds while the instance wakes up  
> and the requested YOLO model loads. Subsequent requests are fast.

> **Ephemeral filesystem:** Uploaded images and reports are stored on the local disk  
> and are **not persisted** across deploys or instance restarts. This is expected for  
> an academic free-tier deployment. Do not claim reports are permanently stored.

### 2. Vercel — Frontend

**Root directory:** `frontend`  
**Framework preset:** Vite  
**Build command:** `npm run build`  
**Output directory:** `dist`

React Router SPA routing is handled by `frontend/vercel.json` (already in the repo).

**Environment variable — set in Vercel dashboard:**

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://your-civisight-api.onrender.com` |

> Set `VITE_API_BASE_URL` under **Project Settings → Environment Variables** in Vercel.  
> Do not commit the actual Render URL into source code.

### 3. After Deploying

1. Check backend health: `https://your-render-service.onrender.com/api/health`
2. Open your Vercel URL and verify the landing page loads.
3. Navigate to `/dashboard`, upload a sample image, and confirm inference completes.
4. Download a PDF report to confirm report generation works.

### Memory Behaviour (Render Free, 512 MB)

| Phase | RAM usage (approx.) |
|---|---|
| Startup | ~60–80 MB (no models loaded) |
| After first crack inspection | +~100 MB (crack_yolo loaded) |
| After first pothole inspection | +~50 MB |
| After first safety inspection | +~120 MB (yolov8n + helmet) |

Models are lazy-loaded on first use and cached for subsequent requests.  
`MAX_CONCURRENT_INFERENCES=1` prevents two YOLO inferences from overlapping.

---

## Model Weights

| File | Size | Source | Purpose |
|---|---|---|---|
| `crack_yolo.pt` | ~22 MB | `OpenSistemas/YOLOv8-crack-seg` (HuggingFace) | Primary crack detector |
| `pothole_yolo.pt` | ~6 MB | `peterhdd/pothole-detection-yolov8` (HuggingFace) | Pothole detector |
| `helmet_yolo.pt` | ~6 MB | `keremberke/yolov8n-hard-hat-detection` (HuggingFace) | Hard-hat detector |
| `yolov8n.pt` | ~6 MB | Ultralytics (auto-downloaded on first run) | Person detector |

All files go in `backend/models/`. The registry file at `backend/models/registry.yaml`  
tells the application where to find each weight.

> **Fallback behaviour:** If `crack_yolo.pt` is absent, the crack detector  
> automatically falls back to a classical multi-scale Sato ridge filter.  
> The other modules require their weights to produce results.

---

## Environment Variables

All variables live in `backend/.env` (copy from `backend/.env.example`).

| Variable | Default | Description |
|---|---|---|
| `APP_ENV` | `development` | Application environment |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Comma-separated allowed origins |
| `MAX_UPLOAD_MB` | `10` | Maximum image upload size |
| `MAX_IMAGE_DIM` | `1920` | Maximum image dimension (px) |
| `RETENTION_HOURS` | `168` | Hours to keep uploaded files before cleanup |
| `MODEL_REGISTRY_PATH` | `models/registry.yaml` | Path to model registry (relative to `backend/`) |
| `STORAGE_DIR` | `storage` | Directory for uploaded/annotated images |
| `MAX_CONCURRENT_INFERENCES` | `2` | Parallel inference slots |
| `LOG_LEVEL` | `INFO` | Python logging level |

---

## Running Tests

```bash
# From repo root — venv must be active
python -m pytest backend/app/tests -v
```

Expected: **11 passed**.

```bash
# End-to-end smoke test (requires the backend to be running on port 8000)
python backend/scripts/e2e_smoke.py
```

---

## Building for Production

```bash
cd frontend
npm run build
# Output: frontend/dist/
```

The build output is a standard static SPA that can be served by any static host  
(Nginx, Caddy, Vercel, Netlify, etc.) with `/api/*` proxied to the backend.

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | System status, model load state, device info |
| `/api/analyze` | POST | Run inspection (`image` file + `inspection_type` form field) |
| `/api/images/{id}/original` | GET | Retrieve original uploaded image |
| `/api/images/{id}/annotated` | GET | Retrieve annotated output image |
| `/api/report/{analysis_id}` | POST | Generate and download PDF inspection report |
| `/api/progress/{client_request_id}` | GET | SSE progress stream |

Interactive documentation: **http://localhost:8000/docs** (Swagger UI)

Full reference: [`docs/API.md`](docs/API.md)

---

## Troubleshooting

### `ModuleNotFoundError: No module named 'backend'`

You are running the backend from inside `backend/` or `backend/app/`.  
**Always run Python commands from the repo root:**

```bash
# ✗ Wrong
cd backend && python -m uvicorn app.main:app ...

# ✓ Correct (from repo root)
python -m uvicorn backend.app.main:app --reload --port 8000
```

### `uvicorn: command not found`

Use `python -m uvicorn` instead of the bare `uvicorn` command.  
This uses the venv-local uvicorn and does not require it to be on `PATH`.

### Frontend shows "Backend offline"

1. Confirm the backend is running: `curl http://localhost:8000/api/health`
2. Confirm it is on port **8000** (the Vite proxy is hardcoded to `http://localhost:8000`)
3. Check for CORS errors in the browser DevTools console

### Port already in use

```bash
# Find and kill the process on port 8000 (Windows PowerShell)
Get-NetTCPConnection -LocalPort 8000 | ForEach-Object { Stop-Process -Id $_.OwningProcess }

# Port 5173 (frontend)
Get-NetTCPConnection -LocalPort 5173 | ForEach-Object { Stop-Process -Id $_.OwningProcess }
```

### Model weights missing after clone

The `.pt` files are git-ignored. Re-download them:

```bash
python backend/scripts/download_models.py
python backend/scripts/train_crack_model.py
```

### `venv\Scripts\activate` not recognised in Git Bash

Use the Bash form:

```bash
source backend/venv/Scripts/activate
```

### Windows execution policy blocks `activate`

In PowerShell:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## Documentation

| Document | Description |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture and data flow |
| [`docs/API.md`](docs/API.md) | Full API reference with request/response examples |
| [`docs/ENGINEERING_METHODOLOGY.md`](docs/ENGINEERING_METHODOLOGY.md) | CV algorithms and engineering formulas |
| [`docs/VIVA_NOTES.md`](docs/VIVA_NOTES.md) | Design decisions and Q&A preparation |
| [`backend/models/MODEL_CARD.md`](backend/models/MODEL_CARD.md) | Model sources, training data, and limitations |
| [`CIVISIGHT_AI_PRD.md`](CIVISIGHT_AI_PRD.md) | Full product requirements document |

---

## Capabilities

### Module A — Concrete Crack Detection

- **Primary:** YOLOv8n-seg instance segmentation (`crack_yolo.pt`)  
  trained on the Ultralytics `crack-seg` dataset (100 epochs, `OpenSistemas/YOLOv8-crack-seg`)
- **Fallback:** Classical multi-scale Sato ridge filter (Hessian eigenvalues, CLAHE, hysteresis thresholding) — activates automatically when weights are absent
- Scale-invariant relative length and damage area ratio calculations

### Module B — Asphalt Pothole Detection

- YOLOv8 detection model (`pothole_yolo.pt`, `peterhdd/pothole-detection-yolov8`)
- 9-quadrant spatial discretisation and relative surface footprint metrics

### Module C — Site Safety & PPE Observation

- Dual-detector: COCO `yolov8n` person detector + `helmet_yolo.pt` hard-hat model
- Deterministic geometric head-region association algorithm
- Visible PPE compliance rate and assessability thresholds

### Deterministic Engineering Assessment

- 0–100 Visual Condition Indicators with penalty breakdowns
- Rule-based severity classification (`low`, `moderate`, `high`)
- Code-grounded recommendations and transparent technical limitations
- ReportLab PDF inspection report builder

---

## Attributions

- **YOLOv8 / Ultralytics:** AGPL-3.0 License
- **OpenSistemas/YOLOv8-crack-seg:** Open Academic (HuggingFace)
- **keremberke/yolov8n-hard-hat-detection:** MIT License
- **peterhdd/pothole-detection-yolov8:** Open Academic (HuggingFace)
- **OpenCV:** Apache-2.0 License
- **scikit-image:** BSD 3-Clause License
- **Sample Images:** Wikimedia Commons — Creative Commons licenses  
  (see [`frontend/public/sample-data/ATTRIBUTION.md`](frontend/public/sample-data/ATTRIBUTION.md))
