# CiviSight AI — REST API Documentation

This document specifies the REST API exposed by the CiviSight AI FastAPI backend on `http://localhost:8000`.

---

## 1. Overview & Conventions

- **Base URL:** `http://localhost:8000` (or configured via `API_BASE_URL` / `VITE_API_BASE_URL`)
- **Format:** All JSON responses use standard UTC ISO-8601 timestamps (`YYYY-MM-DDTHH:MM:SSZ`).
- **Error Responses:** All errors return a uniform JSON schema with a standard error code and message.

### Uniform Error Response Schema
```json
{
  "error": {
    "code": "INVALID_IMAGE_FORMAT",
    "message": "File is not a valid JPEG, PNG, or WebP image.",
    "details": {}
  }
}
```

### Error Code Catalog
| HTTP Code | Error Code | Description |
|-----------|------------|-------------|
| 400 | `INVALID_IMAGE_FORMAT` | File lacks valid magic bytes for JPEG, PNG, or WebP. |
| 400 | `CORRUPT_IMAGE` | Pillow image verification failed or bytes are truncated. |
| 400 | `IMAGE_TOO_SMALL` | Image width or height is below 64 pixels. |
| 400 | `UNSUPPORTED_INSPECTION_TYPE` | Module must be `crack_detection`, `pothole_detection`, or `safety_detection`. |
| 413 | `FILE_TOO_LARGE` | Uploaded file exceeds configured limit (default: 10 MB). |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | File extension or MIME type not supported. |
| 404 | `FILE_NOT_FOUND` | Analysis ID not found or file expired after 24h retention. |
| 500 | `INFERENCE_FAILED` | Internal computer vision pipeline failure. |
| 503 | `MODULE_UNAVAILABLE` | Required model weights are not loaded. |

---

## 2. Endpoints

### 2.1 Health Check
**`GET /api/health`**

Returns server health, loaded models, compute device, and limits.

#### Response `200 OK`
```json
{
  "status": "ok",
  "version": "1.0.0",
  "device": "cpu",
  "torch_version": "2.14.1+cpu",
  "opencv_version": "4.11.0",
  "modules": {
    "crack_detection": {
      "available": true,
      "mode": "classical_baseline",
      "model": "classical_sato_ridge",
      "score_type": "heuristic_score",
      "note": "Classical Sato ridge filter baseline active."
    },
    "pothole_detection": {
      "available": true,
      "mode": "primary_yolo",
      "model": "pothole_yolo.pt",
      "score_type": "model_confidence",
      "note": null
    },
    "safety_detection": {
      "available": true,
      "mode": "full_compliance",
      "model": "yolov8n.pt + helmet_yolo.pt",
      "score_type": "model_confidence",
      "note": null
    }
  },
  "limits": {
    "max_upload_mb": 10,
    "allowed_types": ["image/jpeg", "image/png", "image/webp"]
  }
}
```

---

### 2.2 Analyze Image
**`POST /api/analyze`**

Runs the selected CV/AI pipeline on an uploaded image.

#### Request (Multipart Form Data)
- `file` (File, required): Image file (JPG, PNG, or WEBP, max 10 MB).
- `inspection_type` (string, required): `crack_detection` | `pothole_detection` | `safety_detection`.
- `client_request_id` (string, optional): Client UUID for tracking progress via `/api/progress/{id}`.

#### Response `200 OK`
```json
{
  "analysis_id": "9a1b8c2d3e4f...",
  "created_at": "2026-10-01T16:00:00Z",
  "inspection_type": "pothole_detection",
  "image": {
    "original_filename": "pothole_02.jpg",
    "width": 1280,
    "height": 720,
    "original_url": "/api/files/9a1b8c2d3e4f.../original",
    "annotated_url": "/api/files/9a1b8c2d3e4f.../annotated"
  },
  "model": {
    "name": "pothole_yolo",
    "kind": "yolo",
    "task": "detect",
    "score_type": "model_confidence",
    "weights_file": "pothole_yolo.pt",
    "is_baseline": false
  },
  "status": "detections_found",
  "detections": [
    {
      "id": 1,
      "type": "pothole",
      "score": 0.85,
      "score_type": "model_confidence",
      "bbox": [210.0, 340.0, 580.0, 610.0],
      "bbox_norm": [0.164, 0.472, 0.453, 0.847],
      "location": "bottom-left",
      "area_ratio": 0.078,
      "area_basis": "bbox",
      "relative_length": null,
      "length_basis": null,
      "severity": "high",
      "severity_reason": "Area ratio 0.078 >= 0.050",
      "low_confidence": false,
      "attributes": {}
    }
  ],
  "summary": {
    "total_detections": 1,
    "by_severity": {
      "low": 0,
      "moderate": 0,
      "high": 1
    },
    "overall_severity": "high",
    "total_area_ratio": 0.078,
    "low_confidence_count": 0
  },
  "safety_metrics": null,
  "condition_indicator": {
    "label": "AI-Assisted Visual Condition Indicator",
    "value": 52,
    "max": 100,
    "formula_id": "defect_v1",
    "band": "red",
    "factors": [
      {
        "name": "High-Severity Findings",
        "detail": "1 findings (12.0 pts each, max 30)",
        "penalty": 12.0
      },
      {
        "name": "Area Coverage",
        "detail": "7.8% of frame (max 25 pts)",
        "penalty": 25.0
      }
    ],
    "explanation": "Score penalized by high-severity findings and surface footprint."
  },
  "interpretation": "Analysis detected 1 pothole covering 7.8% of the visual field. High-severity distress is concentrated in the bottom-left quadrant.",
  "recommendations": [
    {
      "level": "urgent",
      "text": "Schedule prompt field verification and asphalt patching to prevent base failure."
    }
  ],
  "warnings": [],
  "limitations": [
    "Single 2D image; no depth, scale, or material data. No structural integrity determination.",
    "Results depend on lighting, angle, distance, resolution, occlusion, and surface texture."
  ],
  "timings_ms": {
    "preprocessing": 24,
    "detection": 95,
    "classification": 8,
    "interpretation": 4,
    "annotation": 32,
    "total": 163
  },
  "disclaimer": "CiviSight AI provides AI-assisted preliminary visual observations and does not replace professional engineering inspection or structural assessment."
}
```

---

### 2.3 Progress Polling
**`GET /api/progress/{client_request_id}`**

Returns current execution stage of an in-flight analysis.

#### Response `200 OK`
```json
{
  "stage": "detection",
  "stages": [
    { "key": "preprocessing", "label": "Image preprocessing", "status": "done" },
    { "key": "detection", "label": "Object/damage detection", "status": "running" },
    { "key": "classification", "label": "Result classification", "status": "pending" },
    { "key": "interpretation", "label": "Engineering interpretation", "status": "pending" }
  ]
}
```

---

### 2.4 File Retrieval
**`GET /api/files/{analysis_id}/{kind}`**

Retrieves stored original or annotated image.
- `kind`: `original` | `annotated`

#### Response `200 OK`
- `Content-Type: image/jpeg`
- Binary JPEG data.

---

### 2.5 Generate / Download PDF Report
**`POST /api/report/{analysis_id}`**

Generates and streams an auditable PDF inspection report.

#### Response `200 OK`
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="civisight_report_{analysis_id[:8]}.pdf"`
