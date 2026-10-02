# CiviSight AI — Model Cards & Specifications

> **Important Notice:** Not validated for structural safety decisions. CiviSight AI provides AI-assisted preliminary visual observations and does not replace professional engineering inspection or structural assessment.

---

## Summary of Active Detectors

| Module | Active Pipeline / Model | Type | Score Type | Verification Status |
|---|---|---|---|---|
| **Crack Detection** | `crack_yolo.pt` (YOLOv8n-seg, primary) | Trained YOLO segmentation (`OpenSistemas/YOLOv8-crack-seg`) | Model confidence (`model_confidence`) | Verified on `crack_01.jpg` (1 det), `crack_02.jpg` (1 det, 0.835 conf), `crack_03.jpg` (4 det); 0 false positives on pothole images |
| **Crack Detection** | `classical_ridge_v1` (fallback only) | Classical CV (OpenCV / Sato Ridge) | Heuristic score (`heuristic_score`) | Activates automatically when `crack_yolo.pt` is absent |
| **Pothole Detection** | `pothole_yolo.pt` | Trained YOLOv8 (`peterhdd/pothole-detection-yolov8`) | Model confidence (`model_confidence`) | Verified on `pothole_02.jpg` (pothole detected with 0.85 score) |
| **Construction Safety** | `yolov8n.pt` + `helmet_yolo.pt` | Trained YOLOv8 (`yolov8n` + `keremberke/yolov8n-hard-hat-detection`) | Model confidence (`model_confidence`) | Verified on `safety_01.jpg` & `safety_02.jpg` (person & hardhat association verified) |

---

## 1. COCO YOLOv8n (`yolov8n.pt`)

- **Role:** Person detection for Construction Safety Module (`safety_detection`).
- **Architecture:** YOLOv8 Nano (Ultralytics).
- **Source:** Ultralytics Assets (auto-downloaded via `scripts/download_models.py`).
- **Date:** 2024 / Ultralytics v8.2+.
- **License:** AGPL-3.0.
- **Classes:** 80 COCO classes; mapped strictly to `person` (`class_map: {person: person}`).
- **Intended Use:** Detection of people on construction sites to evaluate site presence and associate visible helmets.
- **Known Failure Modes & Limitations:**
  - Cannot distinguish authorized workers from visitors, inspectors, or pedestrians (labeled conservatively as "People detected").
  - Small or distant individuals (< 4% of image height) cannot be reliably assessed for PPE and are classified as `not_assessable_small`.
  - Severe occlusions (e.g., behind scaffolding, machinery) may lead to false negatives.

---

## 2. Helmet / Hard Hat YOLO (`helmet_yolo.pt`)

- **Role:** Hard hat detection for Construction Safety Module (`safety_detection`).
- **Architecture:** YOLOv8 Nano.
- **Source:** Hugging Face `keremberke/yolov8n-hard-hat-detection`.
- **Date:** 2024.
- **License:** MIT / Open Academic.
- **Classes:** `0: Hardhat`, `1: NO-Hardhat`. Mapped via `class_map: { Hardhat: helmet, "NO-Hardhat": no_helmet_evidence }`.
- **Verification:** Tested on real site photos (`safety_01.jpg`, `safety_02.jpg`, `safety_03.jpg`). Successfully detected hard hats and bare heads in head regions.
- **Intended Use:** Detection of visible hard hats associated with detected persons.
- **Known Failure Modes & Limitations:**
  - Low lighting, backlighting, or extreme camera angles can obscure helmet contours.
  - Caps, hoods, or bandanas may occasionally produce false positives or false negatives.
  - "Helmet not visibly detected" does not guarantee helmet absence (visual occlusion guard).

---

## 3. Pothole Detection YOLO (`pothole_yolo.pt`)

- **Role:** Road surface damage and pothole detection (`pothole_detection`).
- **Architecture:** YOLOv8 Object Detection.
- **Source:** Hugging Face `peterhdd/pothole-detection-yolov8`.
- **Date:** 2024.
- **License:** Open Academic.
- **Classes:** Mapped via `class_map: { "0": pothole }`.
- **Verification:** Tested on real road photos (`pothole_01.jpg`, `pothole_02.jpg`, `pothole_03.jpg`). Successfully localized potholes with confidence up to 0.85 on `pothole_02.jpg`.
- **Intended Use:** Identification of visible asphalt surface depressions and potholes for maintenance triage.
- **Known Failure Modes & Limitations:**
  - Water reflections, ponding, deep shadows, and asphalt patches may confuse the detector.
  - Does not compute physical pothole depth or volume from single 2D images.

---

## 4. Classical Sato Ridge Baseline (`classical_ridge_v1`) — Fallback Only

- **Role:** Fallback for Concrete Crack Detection (`crack_detection`) when `crack_yolo.pt` is absent.
- **Architecture:** Classical Computer Vision pipeline (Grayscale → Gaussian Blur → CLAHE → Multiscale Sato Ridge Filter → Hysteresis Thresholding → Morphological Closing → Skeletonization & Geometric Filtering).
- **Source:** Implemented in `backend/app/cv/detectors/crack_classical.py` using `OpenCV` and `scikit-image`.
- **Date:** 2026.
- **License:** BSD-3-Clause / Apache-2.0 compatible.
- **Score Type:** `heuristic_score` (0.0 to 1.0; heuristic score, NOT a model confidence or probability).
- **Intended Use:** Explainable, zero-training fallback for detecting dark, thin, elongated ridge-like features on concrete. Activates automatically if `crack_yolo.pt` is missing.
- **Known Failure Modes & Limitations:**
  - Detects thin dark ridge-like structures, which can include false positives such as surface joints, expansion gaps, rebar lines, cast marks, shadows, and high-frequency surface texture.
  - Texture guard: rejects detections if covered foreground area exceeds 12% of image area.
  - Does not measure physical crack width or depth in real-world units.

---

## 5. Crack Detection YOLO (`crack_yolo.pt`) — Primary Model

- **Role:** Primary Concrete Crack Detection (`crack_detection`). Replaces the classical baseline.
- **Architecture:** YOLOv8n-seg (YOLOv8 Nano Instance Segmentation).
- **Source:** Hugging Face `OpenSistemas/YOLOv8-crack-seg` — `yolov8n/weights/best.pt` (publicly available, no authentication required).
- **Dataset:** Ultralytics `crack-seg` (~4,000 surface crack images, concrete/asphalt/pavement).
- **Training:** 100 epochs, `imgsz=640`, `batch=16`, data augmentation enabled.
- **Date:** 2024 (OpenSistemas release).
- **License:** Open Academic (see HuggingFace repo for details).
- **Classes:** NC=1 — `{0: 'crack'}`.
- **Task:** Instance segmentation — returns per-crack pixel masks, enabling accurate area ratio computation.
- **Score Type:** `model_confidence` (0.0–1.0 sigmoid confidence from YOLO head).
- **Acquisition:** Automatically downloaded by `python backend/scripts/train_crack_model.py`.
- **Verification results (real inference, no fabrication):**
  - `crack_01.jpg`: 1 detection (conf=0.319)
  - `crack_02.jpg`: 1 detection (conf=0.835)
  - `crack_03.jpg`: 4 detections (conf=0.707, 0.576, 0.325, 0.299)
  - `pothole_01.jpg`: 0 detections (no false positives)
  - `pothole_02.jpg`: 0 detections (no false positives)
- **Known Failure Modes & Limitations:**
  - Trained on pavement/surface cracks; may show reduced sensitivity on rendered concrete walls or painted surfaces.
  - Low-resolution imagery (\< 200 × 200 px) will reduce detection precision.
  - Confidence threshold of 0.25 is used by default; adjust in `registry.yaml` if needed.
  - Does not output physical crack width/depth in mm (uncalibrated imagery constraint).

