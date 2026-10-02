# CiviSight AI — Engineering & Computer Vision Methodology

This document outlines the computer vision algorithms, mathematical formulations, and engineering principles driving CiviSight AI.

---

## 1. Principles of Uncalibrated Infrastructure Inspection

In practical civil engineering inspections, field photographs are captured under variable conditions without metric fiducial markers, depth sensors, or camera calibration matrices. 

Under these constraints:
1. **Physical measurements (mm, cm) cannot be determined directly:** A crack that is 20 pixels wide in an image might be 0.5 mm wide taken from 20 cm away, or 50 mm wide taken from 20 meters away.
2. **Relative metrics provide scale invariance:** CiviSight AI computes scale-independent geometric metrics, specifically the **Damage Area Ratio**:
   $$\text{area\_ratio} = \frac{\text{Defect Area (px)}}{\text{Total Image Area (px)}}$$
3. **No False Confidence:** The system never reports "0.4 mm crack width" or "15 cm deep pothole" from uncalibrated 2D images. Every observation is clearly reported as a relative visual metric.

---

## 2. Concrete Crack Detection: Trained YOLOv8n-seg Model (Primary)

CiviSight uses a properly trained deep learning segmentation model as the primary crack detector. The classical ridge filter (Section 2.3) is retained as a documented fallback only.

### 2.1 Primary Model: OpenSistemas/YOLOv8-crack-seg (YOLOv8n)

| Attribute | Value |
|---|---|
| Architecture | YOLOv8n-seg (nano segmentation) |
| Source | `OpenSistemas/YOLOv8-crack-seg` (HuggingFace, public) |
| Dataset | Ultralytics `crack-seg` (~4000 surface crack images) |
| Training | 100 epochs, `imgsz=640`, `conf≥0.25` |
| Classes | NC=1: `crack` |
| Task | Instance segmentation (returns pixel-level mask per crack) |
| Weights | `backend/models/crack_yolo.pt` (6.5 MB) |

### 2.2 Why Instance Segmentation for Cracks

Cracks are thin, branched, irregular structures. Pixel-level segmentation masks allow:
- **Accurate mask area ratio:** $\text{area\_ratio} = \frac{\text{mask pixels}}{\text{total image pixels}}$ — more precise than bbox area
- **Crack boundary annotation** drawn directly on segmentation contours in the annotated image

### 2.3 Classical Fallback: Sato Ridge Filter Pipeline

The OpenCV/scikit-image baseline activates automatically only if `crack_yolo.pt` is absent. Not used when the trained model is present.

**When active, processing steps:**
1. **Grayscale + Gaussian blur (5×5)** — sensor noise suppression
2. **CLAHE** (`clipLimit=2.0`, `tileGridSize=(8,8)`) — local contrast enhancement
3. **Multi-scale Sato ridge filter** ($\sigma \in \{1.0, 2.0, 3.0, 4.0\}$) — Hessian eigenvalue ridge response
4. **Hysteresis thresholding** (high=0.30, low=0.15) — connected ridge extraction
5. **Morphological closing** — micro-gap bridging
6. **Texture guard** — rejects if ridge coverage exceeds 20% of image area

To re-acquire the trained model: `python backend/scripts/train_crack_model.py`

---

## 3. Asphalt Pothole Detection: YOLOv8 Pipeline

### 3.1 Detection Architecture
- Potholes are localized using a specialized single-stage convolutional detector (`pothole_yolo.pt`) based on YOLOv8.
- Input images are processed at `imgsz = 640` with an IoU threshold of `0.5` and confidence threshold of `0.25`.

### 3.2 Metric Extraction
- **Normalized Coordinates:** $[x_{\min}, y_{\min}, x_{\max}, y_{\max}]$ mapped into unit interval $[0.0, 1.0]$.
- **Location Grid:** Bounding box centroids categorized into 9 spatial quadrants:
  - `top-left`, `top-center`, `top-right`
  - `middle-left`, `center`, `middle-right`
  - `bottom-left`, `bottom-center`, `bottom-right`
- **Footprint Extent:** $\text{area\_ratio} = \frac{(x_2 - x_1) \times (y_2 - y_1)}{W \times H}$.

---

## 4. Site Safety & PPE Observation: Dual-Detector Association

### 4.1 Architecture
Safety assessment requires verifying whether detected personnel are wearing required personal protective equipment (specifically protective hard hats).

1. **Primary Detector:** YOLOv8n COCO model detects `person` instances ($conf \ge 0.35$).
2. **Secondary Detector:** Specialized hard-hat YOLO model detects `helmet` instances ($conf \ge 0.30$).

### 4.2 Geometric Head-Region Association Algorithm
For each detected person bounding box $[x_1, y_1, x_2, y_2]$ with width $w$ and height $h$:
1. **Assessability Check:** People with height $< 8\%$ of image height are marked `not_assessable_small` (too distant or low-resolution for reliable verification).
2. **Head Region Bounding Box Definition:**
   $$x_{\min} = x_1 - 0.15 \cdot w, \quad x_{\max} = x_2 + 0.15 \cdot w$$
   $$y_{\min} = y_1 - 0.20 \cdot h, \quad y_{\max} = y_1 + 0.35 \cdot h$$
3. **Helmet Matching:**
   A helmet box center $(c_x, c_y)$ is matched to the person if it falls within the Head Region. Ties between multiple candidates are resolved by minimal Euclidean distance to the person's upper midline.
4. **Outcome Classification:**
   - `helmet_visible`: Head region contains a verified helmet detection.
   - `helmet_not_visibly_detected`: Person is assessable but no helmet was matched.
   - `not_assessable_small`: Person resolution insufficient.

---

## 5. Visual Condition Indicator Formulas

### 5.1 Defect Condition Indicator (`defect_v1`)
$$\text{Score} = \max\left(0, 100 - (P_{\text{high}} + P_{\text{mod}} + P_{\text{low}} + P_{\text{area}})\right)$$

Where:
- $P_{\text{high}} = \min(30.0, N_{\text{high}} \times 12.0)$
- $P_{\text{mod}} = \min(20.0, N_{\text{mod}} \times 5.0)$
- $P_{\text{low}} = \min(10.0, N_{\text{low}} \times 2.0)$
- $P_{\text{area}} = \min(25.0, \sum \text{area\_ratio} \times 500.0)$
- *Classical Baseline Cap:* When classical baseline is active, score is capped at $85$ to honestly communicate heuristic uncertainty.

### 5.2 Safety Condition Indicator (`safety_v1`)
$$\text{Score} = \max\left(0, \text{round}(\text{compliance\_rate} \times 100) - \min(30, N_{\text{unprotected}} \times 15)\right)$$

### 5.3 Color Bands
- **Green (80–100):** Lower visual concern / Good visible compliance.
- **Amber (50–79):** Moderate visual concern / Partial compliance.
- **Red (0–49):** Higher visual concern / Significant distress or unprotected personnel.
