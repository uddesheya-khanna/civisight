# CiviSight AI — Product Requirements Document (Implementation Spec)

**Tagline:** AI-Powered Infrastructure Inspection
**Document version:** 1.0
**Audience:** Antigravity (coding agent). This document is the single source of truth for building the application.
**Product type:** Student / academic prototype demonstrating AI + Computer Vision in Civil Engineering.

---

## 0. HOW TO READ THIS DOCUMENT

- Sections marked **MUST** are mandatory. **SHOULD** means strongly preferred. **MAY** means optional.
- Where this document makes a decision (stack, thresholds, formulas, API shapes), follow it. Where it is silent, choose the simplest option that satisfies the acceptance criteria (Section 24).
- Section 1 lists the non-negotiable rules. Re-read them before finishing.
- Section 2 resolves ambiguities up front so you do not have to guess.

---

## 1. NON-NEGOTIABLE RULES

1. **No fake AI.** Every number shown (detections, confidence, severity, metrics, score) MUST be computed from the actual uploaded image by the actual pipeline. No hardcoded results, no random numbers, no canned results keyed on filename or sample name.
2. **No LLM pretending to be a vision model.** Detection is performed by a CV model (YOLO) or a classical CV algorithm (OpenCV). No external LLM/vision API is used for detection.
3. **Honest labeling.** If a result comes from a classical heuristic rather than a trained model, the UI, API, and report MUST say so, and the number MUST be called a *heuristic detection score*, not a *confidence*.
4. **No structural-safety claims.** The app gives *preliminary visual observations*. It never states that a structure is safe, unsafe, sound, or failing.
5. **Absence of detection ≠ safety.** The no-detection state MUST read "No significant target was detected." It MUST NOT say "safe", "no issues", or "everything is fine".
6. **No fabricated physical measurements.** No crack width in mm, no pothole depth, no real-world areas, unless calibrated input exists (it does not in the MVP). Use relative/pixel-based quantities only and label them as relative.
7. **Helmet wording.** Use "Helmet not visibly detected", never "No helmet" or "Not wearing a helmet".
8. **No placeholder buttons, no fake endpoints, no fake auth, no unnecessary database, no paid APIs.**
9. **If a feature is impossible with the available model, document the limitation, build the closest honest alternative, and never fabricate functionality.**
10. **Model-swappable architecture.** UI never touches model code. Models sit behind a detector interface and are configured via a registry file.

---

## 2. DECISIONS ALREADY MADE (do not re-litigate)

| Topic | Decision |
|---|---|
| Frontend | **Vite + React 18 + TypeScript + Tailwind CSS + React Router**. (No Next.js: no SSR needed, simpler to run.) |
| Backend | **Python 3.10–3.12, FastAPI, Uvicorn**. |
| CV libs | OpenCV (headless), NumPy, Pillow, scikit-image, Ultralytics YOLO (v8 API). |
| PDF reports | **ReportLab** (pure Python, no system dependencies; works on Windows). Generated **server-side** from stored results. |
| Persistence | **No database.** Server stores uploaded/annotated images and result JSON on disk under `backend/storage/` (auto-cleaned). Browser `localStorage` stores history. |
| Severity levels | `low`, `moderate`, `high` only. **`critical` is NOT implemented in the MVP** (it would over-claim from a single image). |
| Crack module | Uses a fine-tuned YOLO model if `crack` weights are present; otherwise runs a **documented classical OpenCV baseline**. Both run for real. |
| Pothole module | Requires a trained pothole model. **No fake fallback.** If weights are missing, module reports `model_unavailable` clearly, with setup instructions. (See 9.4 for how to obtain/train weights.) |
| Safety module | COCO-pretrained YOLO for `person` + a PPE/helmet-trained YOLO for `helmet`. If the helmet model is missing, module runs in **person-only degraded mode** and helmet compliance is reported as *unavailable*. |
| Progress UI | Real stage progress via a progress-polling endpoint (Section 12.4). |
| Auth | None. |
| Languages | English only. |

---

## 3. PROJECT OVERVIEW

**CiviSight AI** is a web application that helps civil engineering students, faculty, site engineers, and inspection teams perform **preliminary visual inspection** of infrastructure and construction sites from photographs.

A user uploads an image of concrete structures, roads, pavements, bridges, buildings, or construction sites. The system:

1. Validates and preprocesses the image.
2. Runs a CV model/algorithm for the selected inspection module.
3. Filters detections by confidence.
4. Applies a **civil-engineering interpretation layer** (severity rules, metrics, condition indicator, recommendations).
5. Produces an annotated image and structured JSON.
6. Displays results and generates a downloadable PDF inspection report.

### 3.1 Inspection modules (MVP)

| ID (`inspection_type`) | Name | Detects |
|---|---|---|
| `crack_detection` | Module A — Concrete Crack Detection | Visible cracks in concrete surfaces |
| `pothole_detection` | Module B — Road & Pothole Detection | Visible potholes / road-surface damage |
| `safety_detection` | Module C — Construction Safety | People and visible helmets; helmet-visibility compliance |

### 3.2 Positioning statement (must appear in UI, report, README)

> CiviSight AI provides AI-assisted preliminary visual observations and does not replace professional engineering inspection or structural assessment.

---

## 4. USERS

Primary: civil engineering students, faculty, site engineers, construction supervisors, inspection teams, researchers.
The app is a live-demonstrable academic prototype (college presentation/viva). It must run on a normal laptop with CPU only.

---

## 5. USER JOURNEY

```
Landing Page → Dashboard → Select Module → Upload Image (or Try Demo)
→ Analyze (real staged progress) → Annotated Image → Findings
→ Severity / Condition Indicator → Recommendations → Generate PDF Report
```

Minimum clicks: from Dashboard, selecting a module opens the upload screen directly. Analysis starts with one click. Report is one click from results.

---

## 6. TECH STACK & VERSIONS

**Frontend**
- Node.js **20 LTS or newer**, npm 10+
- Vite, React 18, TypeScript (strict), Tailwind CSS 3.x
- `react-router-dom` v6
- `lucide-react` (icons)
- `react-zoom-pan-pinch` (zoom/pan of annotated image)
- `@fontsource/inter` and `@fontsource/jetbrains-mono` (self-hosted fonts; no CDN dependency)
- `framer-motion` MAY be used sparingly (page/section fade-ins, result reveal). Respect `prefers-reduced-motion`.
- Native `fetch` (no axios required)

**Backend** (`backend/requirements.txt`)
```
fastapi>=0.110
uvicorn[standard]>=0.29
python-multipart>=0.0.9
pydantic>=2.6
pydantic-settings>=2.2
numpy>=1.26
pillow>=10.3
opencv-python-headless>=4.9
scikit-image>=0.22
scipy>=1.11
ultralytics>=8.2
reportlab>=4.1
pyyaml>=6.0
pytest>=8.0
httpx>=0.27
```
- Install CPU PyTorch first on machines without GPU: `pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu`, then `pip install -r requirements.txt`. If a CUDA GPU exists, the standard torch build is used and inference auto-selects GPU (`device` config = `auto`).
- Licensing note (document in README): Ultralytics YOLO is AGPL-3.0; acceptable for an academic prototype, must be noted.

---

## 7. REPOSITORY STRUCTURE

```
civisight-ai/
├── README.md                      # Comprehensive README (Section 21)
├── CIVISIGHT_AI_PRD.md            # This file (copy included for reference)
├── .gitignore
├── frontend/
│   ├── package.json
│   ├── vite.config.ts             # dev proxy: /api → http://localhost:8000
│   ├── tailwind.config.ts / postcss.config.js
│   ├── tsconfig.json
│   ├── index.html
│   ├── .env.example               # VITE_API_BASE_URL=
│   ├── public/
│   │   └── sample-data/           # Demo images + ATTRIBUTION.md (Section 17)
│   └── src/
│       ├── main.tsx, App.tsx, index.css
│       ├── pages/                 # Landing, Dashboard, Inspect, InspectionDetail,
│       │                          # Inspections, Reports, About, NotFound
│       ├── components/
│       │   ├── layout/            # Header, Footer, PageShell, DisclaimerBanner
│       │   ├── upload/            # UploadDropzone, ImagePreview
│       │   ├── analysis/          # AnalysisProgress
│       │   ├── results/           # ResultsView, AnnotatedImageViewer, FindingsTable,
│       │   │                      # ConditionIndicator, SafetyMetrics, Interpretation,
│       │   │                      # Recommendations, NoDetectionState
│       │   └── ui/                # Button, Card, Badge, SeverityBadge, Alert, Spinner
│       ├── lib/
│       │   ├── api.ts             # typed API client (single place that knows URLs)
│       │   ├── types.ts           # TS types mirroring backend schemas
│       │   ├── history.ts         # localStorage history store
│       │   ├── modules.ts         # module metadata for UI copy
│       │   ├── validation.ts      # client-side file validation
│       │   └── format.ts          # number/date/label formatting
│       └── hooks/                 # useAnalysis, useBackendHealth, useHistory
├── backend/
│   ├── requirements.txt
│   ├── .env.example
│   ├── app/
│   │   ├── main.py                # FastAPI app factory, CORS, router mounting, startup model load
│   │   ├── config.py              # pydantic-settings; env vars (Section 22)
│   │   ├── schemas.py             # Pydantic response/request models
│   │   ├── api/
│   │   │   ├── health.py          # GET /api/health
│   │   │   ├── analyze.py         # POST /api/analyze, GET /api/progress/{id}
│   │   │   ├── files.py           # GET /api/files/{analysis_id}/{kind}
│   │   │   └── report.py          # POST /api/report/{analysis_id}
│   │   ├── core/
│   │   │   ├── errors.py          # AppError + exception handlers (uniform error JSON)
│   │   │   ├── validation.py      # file type/size/decode checks, filename sanitizing
│   │   │   ├── storage.py         # disk storage, id generation, retention cleanup
│   │   │   └── progress.py        # in-memory stage tracker (thread-safe)
│   │   ├── cv/
│   │   │   ├── preprocess.py      # EXIF fix, re-encode, resize, color conversion
│   │   │   ├── annotate.py        # draw boxes/masks/labels onto image
│   │   │   ├── registry.py        # loads models/registry.yaml → Detector instances
│   │   │   └── detectors/
│   │   │       ├── base.py        # Detector protocol + RawDetection dataclass
│   │   │       ├── yolo_detector.py
│   │   │       └── crack_classical.py   # OpenCV baseline
│   │   ├── engineering/           # THE CIVIL-ENGINEERING INTERPRETATION LAYER
│   │   │   ├── thresholds.py      # all tunable thresholds in one place
│   │   │   ├── severity.py        # per-finding + overall severity
│   │   │   ├── metrics.py         # area ratios, relative length, location grid
│   │   │   ├── safety.py          # person↔helmet association, compliance
│   │   │   ├── condition.py       # condition indicator formulas
│   │   │   ├── recommendations.py # deterministic recommendation rules
│   │   │   └── interpretation.py  # templated interpretation text
│   │   ├── services/
│   │   │   ├── inference_service.py   # orchestrates the full pipeline
│   │   │   └── report_service.py      # ReportLab PDF builder
│   │   └── tests/                 # pytest suite (Section 23)
│   ├── models/
│   │   ├── registry.yaml          # model configuration (Section 9.2)
│   │   ├── MODEL_CARD.md          # what each weight file is, class list, limits, license
│   │   └── (weights: *.pt)        # git-ignored
│   ├── datasets/                  # git-ignored; README with expected structure
│   │   └── README.md
│   ├── scripts/
│   │   ├── download_models.py     # fetches COCO yolov8n; prints instructions for others
│   │   ├── train_detector.py      # thin wrapper over Ultralytics training
│   │   └── e2e_smoke.py           # end-to-end test against running server
│   └── storage/                   # git-ignored: uploads/, outputs/, results/
└── docs/
    ├── ARCHITECTURE.md
    ├── API.md
    ├── ENGINEERING_METHODOLOGY.md # severity rules, formulas, limits (Section 13–15)
    ├── VIVA_NOTES.md              # Section 20
    └── screenshots/               # placeholders
```

Folder purposes: `cv/` = anything that sees pixels or models; `engineering/` = pure functions turning detections into engineering meaning (no model or web code); `services/` = orchestration; `api/` = HTTP only; `core/` = cross-cutting infrastructure.

---

## 8. ARCHITECTURE

```
Model weights / Classical algorithm
        ↓
Detector (cv/detectors)          ← swappable via registry.yaml
        ↓
Inference Service (services/inference_service.py)
        ↓
Engineering Interpretation Layer (engineering/*)
        ↓
Result JSON + Annotated Image (storage/)
        ↓
FastAPI (api/*)
        ↓
Frontend (lib/api.ts → pages/components)
```

### 8.1 Detector interface (`cv/detectors/base.py`)

```python
@dataclass
class RawDetection:
    label: str                    # normalized label: "crack" | "pothole" | "person" | "helmet" | ...
    score: float                  # 0..1
    bbox: tuple[float, float, float, float]   # x1,y1,x2,y2 in ORIGINAL-image pixels
    mask: np.ndarray | None = None            # optional binary mask, original-image size (uint8 0/1)
    extra: dict = field(default_factory=dict) # e.g. {"skeleton_length_px": 812.4}

class Detector(Protocol):
    name: str                     # e.g. "crack_yolov8n_seg"
    kind: Literal["yolo", "classical_baseline"]
    task: Literal["detect", "segment", "heuristic"]
    score_type: Literal["model_confidence", "heuristic_score"]
    def is_available(self) -> bool: ...
    def load(self) -> None: ...
    def predict(self, image_bgr: np.ndarray) -> list[RawDetection]: ...
    def describe(self) -> dict: ...     # for /api/health and result JSON
```

The inference service depends only on this interface. Swapping a model = editing `registry.yaml` and dropping in new weights. No UI or engineering-layer change.

### 8.2 Pipeline (executed per request)

1. **Validation** — extension + MIME + magic bytes + size + decode via Pillow `verify()` then re-open. Reject corrupt/oversized/unsupported.
2. **Preprocessing** — apply EXIF orientation; convert to RGB; re-encode (strips metadata and any embedded payloads); if long side > `MAX_IMAGE_DIM` (default 1920) downscale preserving aspect ratio; keep scale factor; save as `original.jpg` (quality 92) in storage.
3. **Detection** — registry returns the detector(s) for the module; run `predict()`. YOLO handles letterbox resizing internally (`imgsz` from registry).
4. **Filtering** — drop detections below module confidence threshold; apply NMS settings from registry; clamp boxes to image bounds; drop degenerate boxes.
5. **Engineering interpretation** — metrics → severity → overall severity → condition indicator → recommendations → interpretation text.
6. **Annotation** — draw numbered, severity-colored boxes (and mask overlay when masks exist) on a copy; save `annotated.jpg`.
7. **Persist & respond** — save `result.json`; return structured JSON.

Each stage records elapsed ms into `timings_ms` and updates the progress tracker (12.4).

---

## 9. AI MODEL STRATEGY (HONEST BY DESIGN)

### 9.1 Core principle

A generic COCO-pretrained YOLO **cannot** detect concrete cracks, potholes, or helmets — those are not COCO classes. Therefore:

| Module | Model plan | Status if model absent |
|---|---|---|
| Crack | Fine-tuned YOLO (seg preferred, detect acceptable) → fallback classical OpenCV ridge-detection baseline | App still works using baseline; UI labels it "Classical baseline (heuristic)" |
| Pothole | Fine-tuned YOLO detect | Module returns `MODEL_UNAVAILABLE` (HTTP 503); Dashboard card shows "Model not installed" + link to setup docs. No fake fallback. |
| Safety | COCO `yolov8n.pt` for `person` (auto-downloaded by Ultralytics) + helmet-trained YOLO | Person-only degraded mode; helmet compliance shown as "Unavailable — helmet model not installed" |

### 9.2 Model registry (`backend/models/registry.yaml`)

```yaml
device: auto            # auto | cpu | cuda:0
modules:
  crack_detection:
    primary:
      type: yolo
      weights: models/crack_yolo.pt        # optional; seg or detect
      imgsz: 640
      conf: 0.25
      iou: 0.5
      class_map: { crack: crack }          # model class name -> normalized label
    fallback:
      type: classical_baseline             # crack_classical.py
  pothole_detection:
    primary:
      type: yolo
      weights: models/pothole_yolo.pt
      imgsz: 640
      conf: 0.30
      iou: 0.5
      class_map: { pothole: pothole }      # adapt to the trained model's names (e.g. D40: pothole)
    fallback: null
  safety_detection:
    person:
      type: yolo
      weights: yolov8n.pt                  # COCO; auto-download
      imgsz: 960
      conf: 0.35
      iou: 0.5
      class_map: { person: person }
    helmet:
      type: yolo
      weights: models/helmet_yolo.pt
      imgsz: 960
      conf: 0.35
      iou: 0.5
      class_map: { helmet: helmet }        # adapt (e.g. "Hardhat" -> helmet; "NO-Hardhat" -> no_helmet_evidence)
    fallback: person_only
```

- Class names MUST be read from `model.names` at load time and validated against `class_map`. If none of the mapped classes exist in the model, treat the model as **unavailable** and log a clear error (do not silently produce nothing).
- `class_map` values `no_helmet_evidence` (if the helmet model has a "no helmet/bare head" class) are used as *supporting evidence* only; wording stays "not visibly detected".

### 9.3 Classical crack baseline (`crack_classical.py`) — implement exactly

Purpose: a real, explainable CV method so the Crack module works with no trained weights. Honest limitation: it detects *thin dark ridge-like structures*, which includes false positives (shadows, joints, rebar lines, pavement markings, wood grain, hair-like texture).

Algorithm:
1. Convert to grayscale; downscale so long side ≤ 1280 for processing (remember scale to map back).
2. Gaussian blur (5×5). Apply CLAHE (`clipLimit=2.0`, `tileGridSize=(8,8)`).
3. Ridge response: `skimage.filters.sato(gray_float, sigmas=[1.5, 2.5, 3.5], black_ridges=True)`. Normalize response to 0..1 (divide by 99.5th percentile, clip).
4. Hysteresis threshold: low = 0.25, high = 0.50 (tunable in `thresholds.py`).
5. Morphological close (3×3 ellipse, 1 iteration); remove connected components with area < `0.00015 * H * W`.
6. For each remaining component: skeletonize (`skimage.morphology.skeletonize`); compute `skeleton_length_px`, `area_px`, `mean_width_px = area_px / skeleton_length_px`, bbox, mean ridge response along skeleton.
7. Keep a component only if: `skeleton_length_px ≥ 0.04 * image_diagonal` AND `mean_width_px ≤ 0.02 * image_diagonal` (elongated & thin).
8. **Texture guard:** if total kept foreground area > 12% of the image, discard all and emit warning `"Surface texture produced widespread ridge responses; crack detection is unreliable for this image."` (result = no detections + warning).
9. **Heuristic score** (NOT a probability): `score = clip(0.5 * mean_ridge_norm + 0.5 * min(1, skeleton_length_px / (0.15 * image_diagonal)), 0, 1)`.
10. Return `RawDetection(label="crack", score, bbox, mask=component_mask, extra={skeleton_length_px, mean_width_px})` with coordinates scaled back to original size. `score_type = "heuristic_score"`, `kind = "classical_baseline"`.

UI/report rule: when `score_type == "heuristic_score"`, the column header is **"Detection score (heuristic)"** and a tooltip explains it is not a model probability. A persistent badge "Classical baseline — no trained crack model installed" is shown on results.

### 9.4 Obtaining / training weights — REQUIRED PROCESS

Antigravity MUST attempt model acquisition in this order for each module, and MUST record the outcome (what was found, what was tested, what was used) in `backend/models/MODEL_CARD.md`:

**Step 1 — Look for suitable pretrained weights** (e.g., on Hugging Face, Roboflow Universe, GitHub releases) trained for the target classes. Candidate sources are *unverified suggestions*; Antigravity MUST verify before use:
- load the weights with Ultralytics; print `model.names`;
- confirm the classes match the task;
- confirm the license permits academic use and note it in MODEL_CARD.md;
- run it on at least 3 real images and visually confirm sensible output.

**Step 2 — If no verified weights exist, fine-tune** using `scripts/train_detector.py` (wrapper around Ultralytics) on a public dataset. Candidate datasets (verify availability/licensing at download time):

| Module | Candidate public datasets | Notes |
|---|---|---|
| Crack | Roboflow Universe crack segmentation/detection datasets (YOLO format); CRACK500; DeepCrack | Prefer segmentation-labelled data → `yolov8n-seg`. Classification-only sets (e.g., SDNET2018, "Concrete Crack Images for Classification") are **not suitable** for localization; do not use them for the detector. |
| Pothole | RDD2022 (Road Damage Dataset; includes pothole-type class D40 and covers India among other countries); Roboflow Universe / Kaggle pothole datasets in YOLO format | RDD2022 uses its own annotation format → convert to YOLO if used. |
| Helmet/PPE | SH17 PPE dataset; Kaggle "Hard Hat Detection"; Roboflow Universe hard-hat datasets | Map classes to `helmet`; keep a class for head-without-helmet if present. |

Training defaults (CPU-friendly start; Colab/Kaggle free GPU recommended if CPU is too slow):
```
yolo detect train data=<dataset.yaml> model=yolov8n.pt imgsz=640 epochs=50 batch=8 device=cpu
yolo segment train data=<dataset.yaml> model=yolov8n-seg.pt imgsz=640 epochs=50 batch=8
```
Expected dataset layout (document in `backend/datasets/README.md`):
```
datasets/<name>/
  images/train, images/val, images/test
  labels/train, labels/val, labels/test     # YOLO txt: class cx cy w h  (or polygon for seg)
  data.yaml                                  # path, train, val, test, names
```
After training, copy `runs/.../weights/best.pt` to `backend/models/<module>_yolo.pt`, record training details and validation metrics (mAP50, precision, recall) in MODEL_CARD.md.

**Step 3 — If neither is achievable in the build environment** (no internet, no compute): do NOT fake it. Leave weights absent, ensure the fallback/unavailable behavior works exactly as specified, and document in README "Model setup" what the user must do (download or train) plus the exact commands. Report this clearly in the final summary to the user.

### 9.5 MODEL_CARD.md (required content)

For each weight file: source, date, license, classes, training data, training settings, validation metrics (if trained by you), intended use, known failure modes, suitability statement. Include the sentence: "Not validated for structural safety decisions."

---

## 10. SECURITY

- Allowed types: `.jpg .jpeg .png .webp`; verify by **magic bytes + Pillow decode**, not just extension/MIME.
- Max upload size: `MAX_UPLOAD_MB` (default 10). Enforce server-side while reading (reject early if `Content-Length` too large; also cap bytes read). Client also validates.
- Max pixels: set `Image.MAX_IMAGE_PIXELS = 50_000_000` (decompression-bomb guard). Min dimension 64 px.
- **Never** use the client filename for disk paths. Generate `analysis_id = uuid4().hex`. Keep a sanitized display name (strip path separators, control chars, limit 100 chars) only for display/reports.
- Re-encode all images after decode (strips metadata and embedded content).
- `GET /api/files/{analysis_id}/{kind}` accepts only `kind ∈ {original, annotated}` and `analysis_id` matching `^[a-f0-9]{32}$`; resolve paths under `storage/` and reject traversal.
- Never return absolute filesystem paths, stack traces, or env values in responses. Log details server-side only.
- CORS: allow only origins in `CORS_ORIGINS` (default `http://localhost:5173,http://127.0.0.1:5173`).
- Secrets via env vars only. (The MVP needs no secrets; keep `.env.example` anyway.)
- No code execution of uploaded content. No `pickle` loading from user input. Model weights load only from the configured local paths.
- Retention: delete files under `storage/` older than `RETENTION_HOURS` (default 168 = 7 days) on startup and every hour in a background task.

---

## 11. ENGINEERING INTERPRETATION LAYER (CIVIL ENGINEERING LOGIC)

All thresholds live in `engineering/thresholds.py` (single source, documented, tunable). These are **heuristic visual-triage thresholds chosen for this prototype — they are not code-based engineering criteria**. Do not cite design-code clauses or invent standards. State this in `docs/ENGINEERING_METHODOLOGY.md`.

### 11.1 Geometric metrics (all relative to the image; no real-world units)

- `area_ratio` = detection area / image area. Area basis: mask area if a mask exists (`area_basis: "mask"`), else bbox area (`"bbox"`).
- `relative_length` (cracks): `skeleton_length_px / image_diagonal` when a mask is available (`length_basis: "skeleton"`); otherwise `bbox_diagonal / image_diagonal` (`length_basis: "bbox_diagonal"`).
- `location`: 3×3 grid label of the bbox center: `top-left, top-center, top-right, middle-left, center, middle-right, bottom-left, bottom-center, bottom-right`.
- Perspective/scale caveat: ratios depend on camera distance and angle; they are **relative indicators**, not measurements.

### 11.2 Severity — Crack (per detection)

| Severity | Rule (first match wins, top-down) |
|---|---|
| `high` | `relative_length ≥ 0.40` OR `area_ratio ≥ 0.04` |
| `moderate` | `relative_length ≥ 0.15` OR `area_ratio ≥ 0.01` |
| `low` | otherwise |

Image-level escalation (overall severity):
- overall = max of per-detection severities;
- if overall is `low` and there are ≥ 5 detections with score ≥ 0.5 → overall `moderate`;
- if ≥ 3 detections are `moderate` or higher → overall `high`.

Label everywhere as **"Preliminary visual severity indicator (AI-assisted)"**. Descriptions:
- LOW: small/thin visible crack-like feature
- MODERATE: more prominent, longer, or multiple crack-like features
- HIGH: large/prominent crack pattern — professional inspection recommended

### 11.3 Severity — Pothole (per detection)

| Severity | Rule |
|---|---|
| `high` | `area_ratio ≥ 0.06` |
| `moderate` | `area_ratio ≥ 0.015` |
| `low` | otherwise |

Overall: max of detections; if ≥ 3 detections → at least `moderate`; if ≥ 3 detections are `moderate` or higher → `high`. Label: **"Preliminary maintenance priority indicator"**. Never report depth.

### 11.4 Safety module logic (`engineering/safety.py`)

Definitions:
- "People" = `person` detections (cannot distinguish workers from visitors → UI says **"People detected"**, with a note "assumed to be site personnel").
- A person is **assessable** if bbox height ≥ 4% of image height (small/distant people cannot be reliably assessed for helmets). Non-assessable people are counted separately and excluded from the compliance denominator.
- **Association (person ↔ helmet):** define head region of a person bbox as: x from `x1` to `x2` (±10% width tolerance), y from `y1 - 0.10*h` to `y1 + 0.40*h`. A helmet detection matches a person if the helmet bbox **center** lies in that head region. Each helmet matches at most one person (greedy by smallest center distance to head-region center). Each person matches at most one helmet. Unmatched helmets are listed as `helmet` findings but excluded from compliance numerator.
- Metrics:
  - `people_detected`
  - `people_assessable`
  - `helmets_detected` (all helmet detections above threshold)
  - `people_with_visible_helmet` (assessable & matched)
  - `people_without_visible_helmet` (assessable & unmatched)
  - `visible_helmet_compliance_pct` = `100 * people_with_visible_helmet / people_assessable` (null if `people_assessable == 0` or helmet model unavailable)
- Per-person finding status: `helmet_visible` | `helmet_not_visibly_detected` | `not_assessable_small`.
- Overall severity (only if helmet model available and `people_assessable ≥ 1`):
  - compliance = 100% → `low`
  - 75% ≤ compliance < 100% → `moderate`
  - compliance < 75% → `high`
- Annotation colors: person with helmet = green; person without visible helmet = red (label "Helmet not visibly detected"); helmet = blue; non-assessable person = gray.
- Mandatory caveat text on results: "Helmet not visibly detected does not necessarily mean a helmet is absent. Occlusion, angle, resolution, or model limits may prevent detection."
- Degraded mode (no helmet model): show people count only; compliance card shows "Unavailable — helmet detection model not installed."

### 11.5 AI-Assisted Visual Condition Indicator (0–100)

Always titled **"AI-Assisted Visual Condition Indicator"**, never "Safety Score". Show the factor breakdown and formula link. If there are no detections, **value = null** and the UI displays "Not computed — no significant target detected. This is not an indication of good condition."

**Crack & Pothole formula (`formula_id: "defect_v1"`):**
```
W = { low: 4, moderate: 10, high: 18 }
finding_penalty = min(60, Σ over detections ( W[severity_i] × score_i ))
area_penalty    = min(25, 150 × total_area_ratio)        # total_area_ratio = min(1, Σ area_ratio_i)
indicator       = clamp( round(100 − finding_penalty − area_penalty), 0, 100 )
```
Worked example: detections (moderate, 0.9), (moderate, 0.8), (low, 0.7), total_area_ratio 0.03 → finding_penalty = 9 + 8 + 2.8 = 19.8; area_penalty = 4.5; indicator = round(75.7) = **76**.

**Safety formula (`formula_id: "safety_v1"`):** `indicator = round(visible_helmet_compliance_pct)`; null if compliance is null. Factor listed: compliance %, assessable people count.

Bands (color + text + icon, never color alone): ≥ 80 green "Lower visual concern"; 50–79 amber "Moderate visual concern"; < 50 red "Higher visual concern".

The result JSON includes `factors[]` (name, value, penalty contribution) so UI and report show exactly how the number was derived. If the detector is `classical_baseline`, add the line "Computed from heuristic detection scores."

### 11.6 Recommendation engine (`recommendations.py`) — deterministic

Input: `inspection_type`, `overall_severity`, `status`, `warnings`. Output: ordered list of `{level, text}`. Must be framed as preliminary guidance. Base text (use verbatim):

| Overall | Text |
|---|---|
| `low` | "Continue routine monitoring. No major visible issues were identified by the AI system." |
| `moderate` | "Consider scheduling a detailed inspection and documenting the affected area." |
| `high` | "Professional engineering inspection is recommended. The AI system has identified significant visible concerns." |
| no detection | "No significant target was detected. This does not confirm the absence of defects. If there is any concern, arrange a manual inspection or retake the image with better lighting and a closer view." |

Always append: "This output is an AI-assisted preliminary observation and must not be used as a substitute for engineering judgment."

Module-specific additional bullets (include when severity ≥ low and detections exist):
- Crack: "Photograph affected areas with a scale reference (e.g., a ruler) and record location and date for monitoring over time." / "Look for signs of growth, moisture, staining, or displacement during follow-up."
- Pothole: "Mark or restrict the affected area according to your organization's road-maintenance procedures." / "Record location and approximate extent for maintenance prioritization."
- Safety: "A supervisor should verify helmet use on site; this image-based result may miss helmets that are occluded or too small to resolve."
If the `warnings` list contains low-confidence flags, add: "Some detections have low confidence; verify them visually."

### 11.7 Interpretation text (`interpretation.py`) — templated from real numbers

Examples (generated from computed values):
- Crack: "{n} visible crack region(s) were detected. {k_mod} classified as moderate and {k_low} as low visual concern{, k_high high}. Professional inspection is recommended before making structural decisions."
- Pothole: "{n} visible road-surface damage region(s) were detected, covering approximately {pct}% of the image area. Preliminary maintenance priority: {overall}."
- Safety: "{p} people were detected; {h} with a visible helmet and {m} without a visibly detected helmet (visible helmet compliance {c}%). Occlusion and resolution may affect these results."
- No detection: "No significant target was detected."

---

## 12. BACKEND API

Base path: `/api`. All responses JSON except files/PDF. Interactive docs auto-served at `/docs`.

### 12.1 `GET /api/health`

```json
{
  "status": "ok",
  "version": "1.0.0",
  "device": "cpu",
  "modules": {
    "crack_detection":  { "available": true,  "mode": "classical_baseline", "model": "classical_ridge_v1", "score_type": "heuristic_score", "note": "No trained crack model installed" },
    "pothole_detection":{ "available": false, "mode": "unavailable", "note": "models/pothole_yolo.pt not found" },
    "safety_detection": { "available": true,  "mode": "person_only", "note": "helmet model not installed" }
  },
  "limits": { "max_upload_mb": 10, "allowed_types": ["jpg","jpeg","png","webp"] }
}
```
Never exposes paths. `status` is `ok` if the server is up (module availability reported separately).

### 12.2 `POST /api/analyze` (multipart/form-data)

Fields: `image` (file, required), `inspection_type` (required; enum above), `client_request_id` (optional uuid string for progress polling).

Success `200` response (`AnalysisResult`):

```json
{
  "analysis_id": "3f1c...32hex",
  "created_at": "2026-10-01T10:15:30Z",
  "inspection_type": "crack_detection",
  "image": {
    "original_filename": "pillar_01.jpg",
    "width": 1600, "height": 1067,
    "original_url": "/api/files/3f1c.../original",
    "annotated_url": "/api/files/3f1c.../annotated"
  },
  "model": {
    "name": "classical_ridge_v1",
    "kind": "classical_baseline",
    "task": "heuristic",
    "score_type": "heuristic_score",
    "weights_file": null,
    "is_baseline": true
  },
  "status": "detections_found",
  "detections": [
    {
      "id": 1,
      "type": "crack",
      "score": 0.74,
      "score_type": "heuristic_score",
      "bbox": [412, 90, 780, 610],
      "bbox_norm": [0.2575, 0.0843, 0.4875, 0.5717],
      "location": "center",
      "area_ratio": 0.012,
      "area_basis": "mask",
      "relative_length": 0.21,
      "length_basis": "skeleton",
      "severity": "moderate",
      "severity_reason": "Relative length 0.21 ≥ 0.15",
      "low_confidence": false,
      "attributes": {}
    }
  ],
  "summary": {
    "total_detections": 1,
    "by_severity": { "low": 0, "moderate": 1, "high": 0 },
    "overall_severity": "moderate",
    "total_area_ratio": 0.012,
    "low_confidence_count": 0
  },
  "safety_metrics": null,
  "condition_indicator": {
    "label": "AI-Assisted Visual Condition Indicator",
    "value": 88, "max": 100, "formula_id": "defect_v1", "band": "green",
    "factors": [
      { "name": "Finding penalty", "detail": "moderate × 0.74", "penalty": 7.4 },
      { "name": "Visible damage area penalty", "detail": "area ratio 0.012", "penalty": 1.8 }
    ],
    "explanation": "Derived from finding severity, detection score, and visible damage area. Not a structural safety score."
  },
  "interpretation": "1 visible crack region was detected ...",
  "recommendations": [ { "level": "moderate", "text": "Consider scheduling a detailed inspection and documenting the affected area." } ],
  "warnings": [],
  "limitations": [ "Single-image visual analysis cannot determine structural integrity.", "Crack width and depth cannot be measured from an uncalibrated image." ],
  "timings_ms": { "validation": 12, "preprocessing": 45, "detection": 830, "classification": 6, "interpretation": 3, "annotation": 40, "total": 940 },
  "disclaimer": "CiviSight AI provides AI-assisted preliminary visual observations and does not replace professional engineering inspection or structural assessment."
}
```
(The numbers above are illustrative of the *shape* only; real values always come from the pipeline.)

Safety module additions:
```json
"safety_metrics": {
  "people_detected": 8, "people_assessable": 8, "people_not_assessable": 0,
  "helmets_detected": 7,
  "people_with_visible_helmet": 7, "people_without_visible_helmet": 1,
  "visible_helmet_compliance_pct": 87.5,
  "helmet_model_available": true
}
```
Safety `detections[].type` ∈ `person | helmet`; person entries carry `attributes.helmet_status` ∈ `helmet_visible | helmet_not_visibly_detected | not_assessable_small`; `severity` is `null` for individual safety findings (severity is overall-level only). Safety `summary.total_detections` = `len(detections)`.

No-detection result: `status: "no_detections"`, `detections: []`, `summary.overall_severity: null`, `condition_indicator.value: null`, interpretation = "No significant target was detected.", plus the no-detection recommendation.

### 12.3 Error format and codes

All errors: `{ "error": { "code": "...", "message": "...user-friendly...", "details": {optional safe info} } }`

| HTTP | code | User-facing message |
|---|---|---|
| 415 | `UNSUPPORTED_MEDIA_TYPE` | "Unsupported file type. Please upload a JPG, JPEG, PNG, or WEBP image." |
| 413 | `FILE_TOO_LARGE` | "The image is larger than {MAX} MB. Please upload a smaller image." |
| 400 | `CORRUPT_IMAGE` | "The image could not be read. The file may be corrupt." |
| 400 | `IMAGE_TOO_SMALL` | "The image is too small to analyze (minimum 64×64 pixels)." |
| 422 | `INVALID_INSPECTION_TYPE` | "Unknown inspection type." |
| 503 | `MODEL_UNAVAILABLE` | "The detection model for this module is not available on the server." (+ `details.setup_hint`) |
| 500 | `INFERENCE_FAILED` | "Analysis failed while processing the image. Please try another image." |
| 404 | `NOT_FOUND` | "Result or file not found. It may have expired." |

A global exception handler converts unexpected errors to `INFERENCE_FAILED`/`INTERNAL_ERROR` without leaking internals. The server must never crash on bad input.

### 12.4 `GET /api/progress/{client_request_id}`

Returns the live stage state for an in-flight analysis:
```json
{ "stage": "detection", "stages": [
  { "key": "preprocessing", "label": "Image preprocessing", "status": "done" },
  { "key": "detection", "label": "Object/damage detection", "status": "running" },
  { "key": "classification", "label": "Result classification", "status": "pending" },
  { "key": "interpretation", "label": "Engineering interpretation", "status": "pending" } ] }
```
Implementation: `/api/analyze` is a synchronous `def` endpoint (runs in FastAPI's threadpool, so polling remains responsive). The pipeline calls `progress.set(client_request_id, stage)` at each real stage boundary. In-memory dict with lock; entries expire after 10 minutes. Frontend polls every 300 ms while the analyze request is pending. If `client_request_id` is unknown, return 404 (frontend ignores and keeps the spinner). **No artificial delays anywhere.**

### 12.5 `GET /api/files/{analysis_id}/{kind}`

`kind ∈ original | annotated`. Returns `image/jpeg`. Validates id format. 404 if missing.

### 12.6 `POST /api/report/{analysis_id}`

Loads the stored `result.json` + images by id (never trusts client-sent results) and returns `application/pdf` with `Content-Disposition: attachment; filename="CiviSight_Report_<module>_<YYYYMMDD-HHMM>.pdf"`. 404 if the analysis expired.

PDF contents (A4, ReportLab Platypus):
1. Header: "CiviSight AI — Inspection Report", tagline, generation date/time (UTC and local label), analysis ID.
2. Inspection details: module, original filename, image dimensions, model name/kind (with "Classical baseline (heuristic)" when applicable).
3. Images: original and annotated, side by side or stacked, scaled to fit.
4. Summary: total detections, overall severity (colored label + text), condition indicator with formula id and factor table (or "Not computed").
5. Findings table: #, type, confidence/heuristic score (header adapts), severity, location, relative size. Safety: people/helmet metrics block.
6. Engineering interpretation.
7. Recommendations.
8. Limitations & disclaimer (full text), plus "Severity and scores are heuristic visual indicators, not engineering measurements."
9. Footer on every page: "CiviSight AI · AI-assisted preliminary visual observation · Page X of Y".
Fonts: use ReportLab built-in Helvetica (no font files required).

---

## 13. FRONTEND SPECIFICATION

### 13.1 Routes

| Route | Page |
|---|---|
| `/` | Landing |
| `/dashboard` | Dashboard (module selection) |
| `/inspect/:module` | Inspect flow: upload → analyzing → results (single page, step state). `:module` ∈ `crack`, `pothole`, `safety` |
| `/inspections` | Inspection history (table) |
| `/inspections/:analysisId` | Reopen a past inspection (results view from stored result) |
| `/reports` | Reports page: history entries with "Download report" actions |
| `/about` | About |
| `*` | NotFound with link home |

Header navigation (all pages except possibly Landing's hero minimal variant): **Dashboard · Inspections · Reports · About**, plus logo "CiviSight AI". Backend status pill (from `/api/health`): green "Backend connected" / red "Backend offline". Responsive: nav collapses to a menu button below `md`.

### 13.2 Landing page (exact copy)

- Hero H1: **CiviSight AI**; subtitle: **AI-Powered Infrastructure Inspection**.
- Supporting text: "Use computer vision to identify visible infrastructure damage and construction safety issues from site imagery."
- Primary CTA **Start Inspection** → `/dashboard`. Secondary CTA **How It Works** → smooth scroll to the section.
- Three feature cards: **Crack Detection**, **Road Damage Detection**, **Construction Safety** (one-sentence descriptions of what is detected; each links to its inspect page).
- How it works: **1 Upload → 2 Analyze → 3 Inspect → 4 Report** with one-line explanations.
- Disclaimer block (exact): "CiviSight AI provides AI-assisted preliminary visual observations and does not replace professional engineering inspection or structural assessment."

### 13.3 Dashboard

Header "Inspection Dashboard". Three module cards, each: icon, name, "What the AI detects" bullets, "Limitations" one-liner, availability badge from `/api/health` (`Ready`, `Classical baseline`, `Person-only mode`, `Model not installed`), and a **Start** button (disabled with explanation if module unavailable). Below: "Recent inspections" (last 3 from history) with Reopen links, and a compact disclaimer banner.

### 13.4 Upload component (`UploadDropzone`)

- Drag-and-drop + "Browse files" button (keyboard accessible, `role="button"`, focus ring).
- Accepts `.jpg,.jpeg,.png,.webp`; client validation by type and size (≤ 10 MB, mirror backend; read limit from `/api/health` when available).
- Shows image preview (object URL; revoke on unmount), file name, size, dimensions.
- **Remove** and **Replace** controls.
- Validation errors inline (e.g., "Unsupported file type. Please upload a JPG, JPEG, PNG, or WEBP image.").
- **Analyze** button disabled until a valid image is selected; disabled while analyzing.
- **Try Demo** button opens a small picker of sample images for the current module (Section 17), loads the chosen sample via `fetch` → `Blob` → `File`, and places it in the same uploader state. The user then clicks Analyze; it uses the identical real pipeline.

### 13.5 Analysis experience

- On Analyze: generate `client_request_id`, POST `/api/analyze`, poll `/api/progress/{id}` every 300 ms.
- Show title "Analyzing Infrastructure..." and a 4-stage list: Image preprocessing, Object/damage detection, Result classification, Engineering interpretation. Stage status reflects polled backend state (pending / running spinner / done check). `aria-live="polite"` region announces stage changes.
- On success: brief "Analysis Complete" confirmation (no enforced delay; results render immediately beneath/instead).
- On failure: error card with the backend's `message`, a **Try again** and **Choose another image** action. Network failure: "Cannot reach the CiviSight backend. Make sure the server is running." with the start command hint.

### 13.6 Results view (`ResultsView`)

Layout (desktop two-column; stacked on mobile):

1. **Header strip:** module name, file name, timestamp, model badge (`Trained model: <name>` or `Classical baseline — heuristic`), **Generate Inspection Report** button (downloads PDF; shows spinner; error toast on failure), **New inspection** button.
2. **Overview cards:** Total detections · Overall severity (`SeverityBadge`) · Condition Indicator (`ConditionIndicator`) · (Safety) People / Helmets / Visible helmet compliance %.
3. **Annotated image viewer:** toggle **Annotated | Original**; zoom in/out, mouse-wheel/pinch zoom, pan, **Reset** (via `react-zoom-pan-pinch`). Detection numbers on the image correspond to table rows; hovering/clicking a table row highlights that detection (SHOULD; draw an SVG/canvas overlay for the highlight using `bbox_norm`).
4. **Findings table:** `#`, Type, Confidence (or "Detection score (heuristic)"), Severity (badge + icon), Location, Relative size (`area_ratio` as %, with "relative to image" tooltip), Low-confidence flag. Safety variant shows helmet status text ("Helmet visible" / "Helmet not visibly detected" / "Too small to assess").
5. **Condition Indicator panel:** value/100 with band, factor breakdown, expandable "How is this calculated?" showing the formula from Section 11.5. Title always "AI-Assisted Visual Condition Indicator" with sublabel "Not a structural safety score".
6. **Engineering Interpretation** text.
7. **Recommendations** list (preliminary guidance styling).
8. **Warnings** (if any) and **Limitations** (collapsible, default open on first view).
9. **Disclaimer** banner (always visible at bottom).

No-detection state (`NoDetectionState`): neutral gray info card, headline **"No significant target was detected."**, body "Try a clearer image with better lighting and a closer view." plus "This result does not confirm that the surface or site is free of defects." Never green, never a checkmark, never the word "safe". The condition indicator shows "Not computed".

Low-confidence handling: detections with `score < 0.5` are shown with a "Low confidence" tag and an Alert: "Some detections have low confidence; verify them visually." The backend already dropped anything below the module threshold.

### 13.7 History (localStorage)

Key: `civisight.history.v1`. Max 50 records (drop oldest). Each record:
```ts
{ analysis_id, created_at, inspection_type, filename, total_detections,
  condition_value: number | null, overall_severity: 'low'|'moderate'|'high'|null,
  summary: string,            // the interpretation text
  result: AnalysisResult,     // full result JSON (small; images referenced by URL)
  report_generated_at?: string }
```
- **Inspections page:** table (date, module, file, findings, indicator, severity) with **Open**, **Delete**, and **Clear all** (with confirm dialog). Empty state: "No inspections yet" with CTA to Dashboard.
- **Open** → `/inspections/:analysisId` renders `ResultsView` from the stored `result`. If image URLs 404 (expired), show a notice "Images for this inspection are no longer available on the server" but still show the data; **Generate report** is disabled in that case with explanation.
- **Reports page:** lists the same records with **Download report** (POST `/api/report/{id}`), shows `report_generated_at` when present; empty state as above.
- Wrap all localStorage access in try/catch; fall back gracefully.

### 13.8 About page

Sections: *What is CiviSight AI?*; *Why AI helps in Civil Engineering* (scale of inspection backlog, consistency, documentation, early triage, safety monitoring); *Applications* (infrastructure inspection, road maintenance, construction safety, visual condition assessment); *How it works* (pipeline diagram as simple styled steps); *Models & methods* (reads honest facts: YOLO-based detection where trained models are installed; classical OpenCV baseline otherwise); *Limitations*; and the statement **"AI-assisted inspection does not replace professional engineering assessment."**

### 13.8.1 Global UI strings (use verbatim)

- Disclaimer (long): "CiviSight AI provides AI-assisted preliminary visual observations and does not replace professional engineering inspection or structural assessment."
- No detection: "No significant target was detected."
- Error hint: "No visible target was detected with sufficient confidence. Try a clearer image with better lighting and a closer view."
- Helmet: "Helmet not visibly detected."
- Severity label (crack): "Preliminary visual severity indicator (AI-assisted)".
- Indicator title: "AI-Assisted Visual Condition Indicator".

### 13.9 Design system

Direction: clean, technical, minimal, engineering-grade. Avoid heavy gradients, glassmorphism, cartoon illustrations, and generic "AI sparkle" aesthetics.

- **Typography:** Inter (UI), JetBrains Mono (numeric values, IDs). Base 16px, line-height 1.5, scale: 12/14/16/20/24/32/48.
- **Neutrals:** background `#F7F8FA`, surface `#FFFFFF`, border `#E5E7EB`, text `#0F172A`, muted `#475569`.
- **Brand accent (single):** deep blue `#1E3A8A` (hover `#1E40AF`). Used for primary buttons, links, focus accents.
- **Semantic (consistent everywhere):** green `#15803D` on `#DCFCE7` (low/safe-ish); amber `#B45309` on `#FEF3C7` (moderate); red `#B91C1C` on `#FEE2E2` (high); gray `#475569` on `#F1F5F9` (informational / no-detection / unavailable).
- Severity is always conveyed by **text + icon + color** (accessibility). Contrast ≥ WCAG AA.
- Spacing on a 4/8 px scale; cards `rounded-xl`, 1px border, subtle shadow; max content width ~1200px; generous whitespace.
- Motion: 150–250 ms fades/slides only; disable under `prefers-reduced-motion`.
- Fully responsive: test at 360px, 768px, 1280px. Findings table scrolls horizontally on small screens or collapses to cards.
- Accessibility: semantic landmarks, labels, alt text on images (`alt="Annotated inspection image showing N detections"`), visible focus states, keyboard operability of upload and image viewer controls.
- Favicon + page titles per route.

---

## 14. COMPUTER VISION IMPLEMENTATION DETAILS

### 14.1 Preprocessing (`cv/preprocess.py`)
- `ImageOps.exif_transpose`, convert to RGB, downscale if long side > `MAX_IMAGE_DIM`, save as JPEG q92 → `storage/uploads/{id}/original.jpg`.
- Hand detectors a BGR `np.ndarray` (OpenCV convention). YOLO accepts it directly.
- Do not otherwise alter pixel content before YOLO inference (no aggressive enhancement that would change model input distribution). CLAHE is used only inside the classical baseline.

### 14.2 YOLO detector (`yolo_detector.py`)
- Load via `ultralytics.YOLO(path)` once at startup (lazy-load on first use acceptable); keep singleton per registry entry.
- `results = model.predict(image, imgsz=..., conf=..., iou=..., device=..., verbose=False)`.
- Support both `detect` and `segment` tasks: for `segment`, convert polygon masks to a full-size binary mask (`cv2.fillPoly`), compute bbox from mask if needed.
- Map model class names via `class_map`; ignore unmapped classes.
- Handle GPU/CPU via `device` setting; `auto` = CUDA if `torch.cuda.is_available()` else CPU.
- Wrap inference in try/except → raise `AppError(INFERENCE_FAILED)`.

### 14.3 Annotation (`cv/annotate.py`)
- Thickness scaled to image size (`max(2, round(min(h,w)/300))`), label font scaled similarly.
- Each box labeled `#{id} {type} {score:.2f}` (for heuristic: `#{id} crack ~{score:.2f}`), colored by severity (green/amber/red per Section 13.9) — safety uses color scheme from 11.4.
- If a mask exists: blend a 35% opacity colored overlay and draw the contour; mask drawn *under* labels.
- Output JPEG q90 to `storage/outputs/{id}/annotated.jpg`.

### 14.4 Storage layout
```
backend/storage/{id}/original.jpg
backend/storage/{id}/annotated.jpg
backend/storage/{id}/result.json
```
Atomic writes (write temp then rename). Cleanup task removes directories older than `RETENTION_HOURS`.

---

## 15. LIMITATIONS (must be reflected in `limitations[]`, UI, report, README)

General:
- Single 2D image; no depth, scale, or material data. No structural integrity determination.
- Results depend on lighting, angle, distance, resolution, occlusion, and surface texture.
- Models may produce false positives and false negatives. No detection ≠ no defect.
- Severity levels and the condition indicator are heuristic visual indicators from this prototype, not engineering measurements or code-based classifications.

Per module:
- Crack: width/depth/cause cannot be determined; classical baseline confuses shadows, joints, rebar lines, markings, and texture with cracks; trained models are limited by their training data (surface types, lighting).
- Pothole: depth/volume cannot be determined; water-filled or shadowed potholes, patched repairs, and manholes may be misclassified; perspective distorts relative size.
- Safety: people ≠ workers; helmet detection fails under occlusion/small size; other PPE (vests, boots, harnesses) are not evaluated in the MVP; compliance is *visible* compliance only.

---

## 16. NO-DETECTION & ERROR UX SUMMARY

| Situation | Behavior |
|---|---|
| Unsupported/oversized/corrupt image | Inline/ alert message from Section 12.3; analysis blocked |
| Backend unreachable | Persistent red status pill; Analyze shows network error card |
| Module model missing (pothole) | Dashboard card "Model not installed"; Start disabled with setup link; if reached via URL → results page shows `MODEL_UNAVAILABLE` message |
| Safety helmet model missing | Runs in person-only mode with clear notice |
| No detections | `NoDetectionState` (13.6) |
| Low-confidence detections | Tagged + alert |
| Texture-guard triggered (crack baseline) | `warnings[]` message + no detections state |
| Inference exception | `INFERENCE_FAILED` card, app remains usable |
| Expired result on reopen | Notice; data visible, report disabled |

---

## 17. DEMO MODE

- Directory: `frontend/public/sample-data/` with **3–4 images per module** where licensing permits (target: CC0, public domain, or CC-BY with attribution). Source from Wikimedia Commons / Unsplash / Pexels / open datasets. Record every file's source URL, author, and license in `sample-data/ATTRIBUTION.md`. If an image cannot be licensed or downloaded, do not include it; do not fabricate or AI-generate "real" site photos presented as real.
- `sample-data/manifest.json`: `[{ "file": "crack_01.jpg", "module": "crack_detection", "title": "Concrete wall surface", "credit": "..." }]`.
- "Try Demo" loads the file and runs the **same** upload → `/api/analyze` path. There is no demo-specific code path on the backend and no result caching keyed by filename.
- Choose samples honestly: include a variety (clear cases and harder cases). Do not tune thresholds to make specific demo images look good. During verification, record in `docs/DEMO_NOTES.md` what the pipeline actually produced for each sample (including failures/false positives), so the presenter is prepared.
- If a module is unavailable (pothole model missing), its demo images are hidden with an explanatory message.

---

## 18. PERFORMANCE

- CPU-only must work. Typical targets (on a modern laptop CPU, ≤ 1920px input): crack baseline ≤ 5 s; YOLOv8n detect ≤ 3 s; safety (two models) ≤ 6 s. Document actual measured timings in README.
- Load models at startup (or lazily on first request, cached) — never per request.
- Limit YOLO `imgsz` per registry; downscale oversized inputs.
- Frontend: lazy-load route pages; no heavy dependencies; images use `loading="lazy"` where appropriate.
- Optional: restrict concurrent inferences with a semaphore (default 2) so a laptop doesn't thrash.

---

## 19. SETUP & RUN (document exactly in README; adapt if actual files differ)

**Prerequisites:** Node.js ≥ 20, Python 3.10–3.12, Git. ~2 GB free disk (PyTorch). Internet needed once for dependencies and model download.

**Backend**
```bash
cd backend
python -m venv venv
# macOS/Linux: source venv/bin/activate     Windows: venv\Scripts\activate
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu   # CPU-only machines
pip install -r requirements.txt
cp .env.example .env                       # Windows: copy .env.example .env
python scripts/download_models.py          # fetches yolov8n.pt (COCO); prints guidance for other weights
uvicorn app.main:app --reload --port 8000
```
Check: open `http://localhost:8000/api/health` and `http://localhost:8000/docs`.

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env                       # VITE_API_BASE_URL empty → uses Vite proxy to :8000
npm run dev                                # http://localhost:5173
```
**Tests**
```bash
cd backend && pytest -q
cd frontend && npm run build && npm run lint   # type-check must pass
python backend/scripts/e2e_smoke.py        # with backend running
```

**Common errors to document:** wrong Python version; `torch` install failures (use the CPU index URL); `CORS` errors (add the frontend origin to `CORS_ORIGINS`); `MODEL_UNAVAILABLE` (weights missing → see Model Setup); port 8000/5173 in use; Windows long-path or `opencv` import issues (use `opencv-python-headless` only); slow first request (model load/warm-up).

---

## 20. ACADEMIC VALUE (create `docs/VIVA_NOTES.md` and mirror in README)

Include these clearly separated sections:

1. **Where AI is used:** object detection (YOLO) for cracks/potholes/helmets/persons; optional instance segmentation; classical computer vision (ridge filtering) as a baseline; training/fine-tuning workflow and metrics (mAP, precision, recall).
2. **Where Civil Engineering knowledge is used:** choice of inspection targets (cracks, road distress, site safety); severity logic based on extent/prominence/multiplicity; relative-size metrics and why absolute units need calibration; maintenance-priority framing; limits of visual inspection vs. NDT/structural assessment; recommendation framing in line with inspection practice (document, monitor, escalate).
3. **What the model does:** takes an image, outputs boxes/masks + confidence for target classes.
4. **What the engineering interpretation layer does:** converts raw detections into severity, metrics, condition indicator, and recommendations using transparent rules.
5. **What the limitations are:** Section 15.
6. **Likely viva questions with answers** (at least 10): e.g., "Why can't you say the structure is safe?", "How is the score computed?", "Why heuristic baseline?", "How would you improve accuracy?", "What is mAP?", "How would you calibrate real crack width?" (reference object / known camera geometry / photogrammetry), "What does IoU/NMS do?".

---

## 21. README (required contents)

Project overview · screenshots (placeholders in `docs/screenshots/`) · architecture diagram (ASCII or Mermaid) · features · tech stack · installation · running locally · **Model setup** (what is installed, how to obtain/train, exact commands, current status of each module) · dataset details · API documentation (or link to `docs/API.md`) · engineering methodology link · limitations · security notes · troubleshooting · testing · future improvements · licenses/attributions (incl. Ultralytics AGPL-3.0 note and sample-data credits).

**Future extensions (document only; NOT implemented in MVP):** drone imagery analysis; bridge inspection; structural component recognition; thermal imagery; LiDAR integration; GIS mapping; historical damage comparison; predictive maintenance; mobile application; cloud inference; automated inspection scheduling; multilingual reports; calibrated crack-width measurement using reference objects.

---

## 22. ENVIRONMENT VARIABLES

**Backend `.env.example`**
```
APP_ENV=development
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
MAX_UPLOAD_MB=10
MAX_IMAGE_DIM=1920
RETENTION_HOURS=168
MODEL_REGISTRY_PATH=models/registry.yaml
STORAGE_DIR=storage
MAX_CONCURRENT_INFERENCES=2
LOG_LEVEL=INFO
```
**Frontend `.env.example`**
```
VITE_API_BASE_URL=
```
No secrets are required. Nothing sensitive is exposed to the frontend.

---

## 23. TESTING REQUIREMENTS

**Backend (pytest) — MUST include:**
- Validation: rejects `.gif`, `.txt` renamed `.jpg`, truncated/corrupt image, oversized file, tiny image.
- Filename sanitization and traversal attempts on `/api/files`.
- Crack classical detector on a **synthetically generated test image** (programmatically drawn dark thin curved line on a noisy gray background) → detects ≥ 1 region; on a plain noisy image → returns none. (This tests the algorithm; it is a test fixture, not app behavior.)
- Texture-guard test (dense random lines image → warning + no detections).
- Severity functions: boundary-value tests against the Section 11 tables.
- Safety association: unit tests with hand-made boxes (helmet inside head region → matched; helmet beside person → unmatched; one helmet cannot match two people; small person → not assessable; zero people → no compliance).
- Condition indicator: worked example from 11.5 yields 76; null when no detections.
- Recommendation engine: each level returns the exact text.
- `/api/health`, `/api/analyze` (success on synthetic image for crack/safety-person-only; `MODEL_UNAVAILABLE` for pothole when weights absent), `/api/report` returns a non-empty PDF starting with `%PDF`.
- Result JSON schema validation against Pydantic models.

**Frontend:** `npm run build` (strict TS) and lint pass. Unit tests for `validation.ts` and `history.ts` are SHOULD. Manual E2E checklist in README.

**End-to-end (`scripts/e2e_smoke.py`):** against a running server — health → analyze each *available* module with a real sample image → check JSON fields exist and `image` URLs fetch successfully → download PDF → assert `%PDF` and size > 10 KB → print timings.

---

## 24. ACCEPTANCE CRITERIA (project is complete only when ALL apply)

**Frontend**
- [ ] Landing page works with exact copy and working CTAs
- [ ] Dashboard works; module cards reflect real backend availability
- [ ] Module selection routes to the upload screen
- [ ] Image upload works (drag-drop and browse); validation errors shown
- [ ] Image preview, remove, replace work
- [ ] Analyze disabled until an image is selected
- [ ] Loading state shows real backend stages
- [ ] Results page works; annotated image displayed with zoom/pan/reset and original/annotated toggle
- [ ] Findings, severity, confidence/score, locations displayed
- [ ] Condition indicator + factor breakdown + formula displayed (or "Not computed")
- [ ] Interpretation and recommendations displayed
- [ ] No-detection state matches spec (never says "safe")
- [ ] Report generation downloads a PDF
- [ ] Inspections and Reports pages work; history reopen works
- [ ] About page complete
- [ ] "Try Demo" loads a sample and runs the real pipeline
- [ ] Responsive at 360 / 768 / 1280 px; keyboard accessible
- [ ] No buttons or links that do nothing

**Backend**
- [ ] FastAPI runs; `/docs` loads
- [ ] `/api/health` reports real module availability
- [ ] `/api/analyze` accepts uploads and validates them (type, size, corrupt, tiny)
- [ ] Real preprocessing and real inference occur
- [ ] Structured results returned matching the schema
- [ ] Progress endpoint reflects real stages
- [ ] Errors use the uniform format and never crash the server
- [ ] Storage cleanup and filename safety implemented

**AI**
- [ ] Models/algorithms actually perform inference on the uploaded image
- [ ] Confidence/score values come from inference; heuristic scores are labeled as such
- [ ] Different images produce different, image-dependent results
- [ ] No hardcoded or fabricated outputs anywhere in code (grep for suspicious constants before finishing)
- [ ] MODEL_CARD.md documents every weight/algorithm and its status

**Reporting**
- [ ] PDF contains real analysis data, both images, findings, metrics, interpretation, recommendations, limitations, disclaimer, branding, timestamp

**Documentation**
- [ ] README, API.md, ARCHITECTURE.md, ENGINEERING_METHODOLOGY.md, VIVA_NOTES.md, MODEL_CARD.md, DEMO_NOTES.md, sample-data ATTRIBUTION.md exist and are accurate

---

## 25. PRIORITY ORDER (when trade-offs arise)

1. Working AI functionality
2. Working end-to-end application
3. Civil Engineering relevance
4. Professional UI
5. Documentation
6. Extra features

Never sacrifice real functionality for visual polish.

---

## 26. INTERNAL CONSISTENCY NOTES (already resolved)

- "CRITICAL" severity from the original brief is intentionally excluded; the engine uses `low/moderate/high`.
- "Confidence" is only used for trained-model scores; the classical baseline reports a "heuristic detection score".
- Pothole has no heuristic fallback because a classical pothole detector would produce unreliable output that risks being presented as AI findings; the module degrades to an explicit "model not installed" state instead.
- Safety "workers" are detected as "people"; helmet compliance excludes people too small to assess.
- Real-time progress uses polling against actual pipeline stages (no fake delays).
- Reports are built on the server from stored results to guarantee they reflect the real analysis.

---

# ANTIGRAVITY BUILD INSTRUCTIONS

Follow these steps in order. Do not skip verification steps.

1. **Read the entire PRD before writing any code.** Re-read Section 1 (Non-Negotiable Rules) and Section 2 (Decisions) first.
2. **Inspect the existing repository** before changing anything. Note existing files, versions of Node/Python available, and any conflicting structure. Do not delete user files.
3. **Create the project structure** exactly as in Section 7 (adjust only where justified; document deviations in `docs/ARCHITECTURE.md`).
4. **Implement the backend**: config, errors, validation, storage, progress tracker, detector interface, YOLO detector, classical crack detector, registry loader, engineering layer, inference service, API routes, report service.
5. **Implement the real computer-vision pipeline** per Sections 8, 9, and 14. Use the Detector interface; keep UI and model code fully decoupled.
6. **Download/use appropriate models** following Section 9.4: run `download_models.py` for COCO `yolov8n.pt`; search for verified crack, pothole, and helmet weights; verify each by inspecting `model.names` and running on real images; if none are verifiable, fine-tune on a public dataset if compute allows. Record every outcome in `backend/models/MODEL_CARD.md`.
7. **Implement the frontend** per Section 13 (pages, components, design system, history, demo mode).
8. **Connect frontend to backend** via `lib/api.ts` (single API client), including the progress polling, health status, error mapping, and PDF download.
9. **Test every major flow** manually and with the automated tests in Section 23: each module (or its documented unavailable state), upload validation errors, no-detection state, low-confidence handling, history reopen, report download.
10. **Fix all runtime errors and warnings** (backend logs, browser console, TypeScript, lint).
11. **Verify that uploaded images produce actual inference results**: run at least 3 different real images through each available module and confirm that results differ appropriately and the annotations correspond to visible content. Record observations in `docs/DEMO_NOTES.md` (include false positives/negatives honestly).
12. **Verify report generation** works for every available module, the PDF opens, includes both images, the findings table, metrics, interpretation, recommendations, limitations, and disclaimer.
13. **Verify that no buttons or links are placeholders** — click through every control and route.
14. **Create the README and docs** (Section 21 and the Acceptance Criteria documentation list).
15. **Run the application locally** (backend on :8000, frontend on :5173) from a clean clone using only the README commands, to confirm the instructions are correct.
16. **Perform a final end-to-end test** using `scripts/e2e_smoke.py` and a manual walkthrough of the full user journey: Landing → Dashboard → select module → upload/Try Demo → Analyze → results → Generate report → Inspections → reopen.
17. **Search the codebase** for hardcoded detection values, random-number generation in result paths, mock data, TODO placeholders, and `console.log` debris; remove them.
18. **Produce a final summary** for the user listing: what works, which models/weights are installed vs. missing per module and exactly what the user must do to install/train missing ones, measured timings, known limitations, and anything not completed.

**If a requested feature is technically impossible with the chosen model or environment, you MUST:**
- clearly document the limitation (README, MODEL_CARD, UI where relevant),
- implement the closest valid, honest alternative,
- and **NOT fabricate functionality, results, metrics, or model capabilities.**

Do not mark the project complete until every item in Section 24 is checked or its exception is explicitly documented with the reason.
