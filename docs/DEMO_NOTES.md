# CiviSight AI — Demo Observation Notes

This document honestly records the actual performance of the CiviSight AI pipeline on the demo sample images provided in `frontend/public/sample-data/`, as required by PRD Section 17.

---

## 1. Concrete Crack Detection (`crack_detection`)
**Pipeline:** Classical OpenCV Sato Ridge Baseline (`classical_ridge_v1`)

| Sample File | Title | Observed Output | Notes & Analysis |
|---|---|---|---|
| `crack_01.jpg` | Cracks in concrete slab | 0 detections (`no_detections`), Texture Guard triggered | Surface has dense gravel texture. The pipeline's texture guard safely rejected the frame to prevent widespread false positives. |
| `crack_02.jpg` | Concrete wall surface fracture | 0 detections (`no_detections`), Texture Guard triggered | High-resolution wall with strong aggregate texture. Correctly emitted texture-guard warning rather than false cracks. |
| `crack_03.jpg` | Concrete crack measurement specimen | 24 crack segments detected, scores up to 0.97, overall severity: `HIGH` | High-contrast linear crack cleanly identified and skeletonized. |

**Key Demonstration Takeaway:** Highlights the difference between genuine isolated fracture lines and rough aggregate surface textures, showing how the built-in texture guard protects against false alarms.

---

## 2. Road Damage & Pothole Detection (`pothole_detection`)
**Pipeline:** Trained YOLOv8 (`pothole_yolo.pt`)

| Sample File | Title | Observed Output | Notes & Analysis |
|---|---|---|---|
| `pothole_01.jpg` | Asphalt road pothole distress | 0 detections | Pothole is shallow with low contrast against dry surrounding asphalt; below confidence threshold (0.25). |
| `pothole_02.jpg` | Urban street surface breakdown | 3 detections (scores: 0.85, 0.43, 0.25), overall severity: `HIGH` | Excellent bounding box localization around the main road cavity and secondary surface depression. |
| `pothole_03.jpg` | Roadway pothole damage | 0 detections | Small resolution (448×298 px) and distant perspective prevented confident target identification. |

**Key Demonstration Takeaway:** Demonstrates real model inference behavior where clear, high-contrast road defects are accurately isolated while low-resolution or low-contrast frames yield honest `no_detections` states.

---

## 3. Construction Safety Module (`safety_detection`)
**Pipeline:** COCO `yolov8n.pt` (Person) + `helmet_yolo.pt` (Hard Hat)

| Sample File | Title | Observed Output | Notes & Analysis |
|---|---|---|---|
| `safety_01.jpg` | Construction personnel with hard hats | 6 detections (people + hard hats), Visible Helmet Compliance: 66.7% | Successfully detected workers and associated hard hats in head regions. One distant worker without visibly detected helmet flagged. |
| `safety_02.jpg` | Site team at construction area | Personnel detected with visible hard hats, Visible Helmet Compliance: 100% | Frontal workers with clear yellow hard hats detected and matched. |
| `safety_03.jpg` | Workers operating on building structure | Personnel detected; distant workers categorized as `not_assessable_small` | Background workers (< 4% image height) excluded from compliance denominator per civil engineering protocol. |

**Key Demonstration Takeaway:** Proves the geometric person-to-helmet association algorithm and the assessability height threshold (excluding distant people from penalizing compliance).
