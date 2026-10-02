from datetime import datetime, timezone
import time
from typing import Dict, Any, List, Optional
import numpy as np

from backend.app.config import settings
from backend.app.core.storage import storage
from backend.app.core.validation import validate_image_file
from backend.app.core.progress import progress
from backend.app.core.errors import AppError, invalid_inspection_type_error
from backend.app.cv.preprocess import preprocess_image
from backend.app.cv.annotate import annotate_image
from backend.app.cv.registry import registry
from backend.app.engineering.metrics import (
    compute_area_ratio,
    compute_relative_length,
    compute_location_grid,
    normalize_bbox,
)
from backend.app.engineering.severity import (
    compute_crack_severity,
    compute_crack_overall_severity,
    compute_pothole_severity,
    compute_pothole_overall_severity,
)
from backend.app.engineering.safety import associate_people_and_helmets
from backend.app.engineering.condition import (
    compute_defect_condition_indicator,
    compute_safety_condition_indicator,
)
from backend.app.engineering.recommendations import generate_recommendations
from backend.app.engineering.interpretation import generate_interpretation_text
from backend.app.engineering.thresholds import LOW_CONFIDENCE_THRESHOLD

DISCLAIMER_TEXT = (
    "CiviSight AI provides AI-assisted preliminary visual observations and does not replace "
    "professional engineering inspection or structural assessment."
)


class InferenceService:
    def run_pipeline(
        self,
        raw_bytes: bytes,
        filename: str,
        inspection_type: str,
        client_request_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        overall_start = time.perf_counter()
        timings: Dict[str, int] = {}
        warnings: List[str] = []

        if inspection_type not in {"crack_detection", "pothole_detection", "safety_detection"}:
            raise invalid_inspection_type_error()

        progress.init(client_request_id)

        # ---------------------------------------------------------------------
        # 1. Validation
        # ---------------------------------------------------------------------
        val_start = time.perf_counter()
        pil_img, sanitized_filename = validate_image_file(raw_bytes, filename)
        timings["validation"] = max(1, round((time.perf_counter() - val_start) * 1000))

        # ---------------------------------------------------------------------
        # 2. Preprocessing
        # ---------------------------------------------------------------------
        progress.set(client_request_id, "preprocessing")
        prep_start = time.perf_counter()
        bgr_image, jpeg_bytes, img_w, img_h, scale_factor = preprocess_image(pil_img)
        timings["preprocessing"] = max(1, round((time.perf_counter() - prep_start) * 1000))

        # ---------------------------------------------------------------------
        # 3. Detection
        # ---------------------------------------------------------------------
        progress.set(client_request_id, "detection")
        det_start = time.perf_counter()

        model_info: Dict[str, Any] = {}
        raw_detections = []
        is_classical = False
        safety_metrics_data = None

        if inspection_type == "crack_detection":
            detector = registry.get_crack_detector()
            model_info = detector.describe()
            is_classical = (detector.kind == "classical_baseline")
            raw_detections = detector.predict(bgr_image)
            if hasattr(detector, "last_warnings") and detector.last_warnings:
                warnings.extend(detector.last_warnings)

        elif inspection_type == "pothole_detection":
            detector = registry.get_pothole_detector()
            model_info = detector.describe()
            raw_detections = detector.predict(bgr_image)

        elif inspection_type == "safety_detection":
            person_det, helmet_det = registry.get_safety_detectors()
            model_info = {
                "name": "yolov8n_person" + (" + helmet_yolo" if helmet_det else ""),
                "kind": "yolo",
                "task": "detect",
                "score_type": "model_confidence",
                "weights_file": "yolov8n.pt",
                "is_baseline": False,
            }
            person_raw = person_det.predict(bgr_image)
            all_helmet_raw = helmet_det.predict(bgr_image) if helmet_det else []
            helmet_raw = [r for r in all_helmet_raw if r.label == "helmet"]

        timings["detection"] = max(1, round((time.perf_counter() - det_start) * 1000))

        # ---------------------------------------------------------------------
        # 4. Classification & Engineering Metrics
        # ---------------------------------------------------------------------
        progress.set(client_request_id, "classification")
        class_start = time.perf_counter()

        structured_detections: List[Dict[str, Any]] = []
        masks_for_annotation: List[Optional[np.ndarray]] = []
        overall_severity = None
        summary_by_severity = {"low": 0, "moderate": 0, "high": 0}

        if inspection_type == "safety_detection":
            people_boxes = [r.bbox for r in person_raw]
            helmet_boxes = [r.bbox for r in helmet_raw]
            has_helmet_model = (helmet_det is not None)

            statuses, safety_metrics_data, overall_sev = associate_people_and_helmets(
                people_boxes, helmet_boxes, img_h, has_helmet_model
            )
            overall_severity = overall_sev

            det_id = 1
            for p_raw, status in zip(person_raw, statuses):
                score = p_raw.score
                loc = compute_location_grid(p_raw.bbox, img_w, img_h)
                area_ratio, area_basis = compute_area_ratio(p_raw.bbox, None, img_w, img_h)
                bbox_norm = normalize_bbox(p_raw.bbox, img_w, img_h)
                is_low_conf = (score < LOW_CONFIDENCE_THRESHOLD)

                structured_detections.append({
                    "id": det_id,
                    "type": "person",
                    "score": score,
                    "score_type": "model_confidence",
                    "bbox": p_raw.bbox,
                    "bbox_norm": bbox_norm,
                    "location": loc,
                    "area_ratio": area_ratio,
                    "area_basis": area_basis,
                    "relative_length": None,
                    "length_basis": None,
                    "severity": None,
                    "severity_reason": None,
                    "low_confidence": is_low_conf,
                    "attributes": {"helmet_status": status},
                })
                masks_for_annotation.append(None)
                det_id += 1

            for h_raw in helmet_raw:
                score = h_raw.score
                loc = compute_location_grid(h_raw.bbox, img_w, img_h)
                area_ratio, area_basis = compute_area_ratio(h_raw.bbox, None, img_w, img_h)
                bbox_norm = normalize_bbox(h_raw.bbox, img_w, img_h)
                is_low_conf = (score < LOW_CONFIDENCE_THRESHOLD)

                structured_detections.append({
                    "id": det_id,
                    "type": "helmet",
                    "score": score,
                    "score_type": "model_confidence",
                    "bbox": h_raw.bbox,
                    "bbox_norm": bbox_norm,
                    "location": loc,
                    "area_ratio": area_ratio,
                    "area_basis": area_basis,
                    "relative_length": None,
                    "length_basis": None,
                    "severity": None,
                    "severity_reason": None,
                    "low_confidence": is_low_conf,
                    "attributes": {},
                })
                masks_for_annotation.append(None)
                det_id += 1

        else:
            severities_list = []
            scores_list = []

            for idx, raw in enumerate(raw_detections, start=1):
                skel_len = raw.extra.get("skeleton_length_px")
                area_ratio, area_basis = compute_area_ratio(raw.bbox, raw.mask, img_w, img_h)
                rel_len, len_basis = compute_relative_length(raw.bbox, skel_len, img_w, img_h)
                loc = compute_location_grid(raw.bbox, img_w, img_h)
                bbox_norm = normalize_bbox(raw.bbox, img_w, img_h)

                if inspection_type == "crack_detection":
                    sev, sev_reason = compute_crack_severity(rel_len, area_ratio)
                else:
                    sev, sev_reason = compute_pothole_severity(area_ratio)

                severities_list.append(sev)
                scores_list.append(raw.score)
                summary_by_severity[sev] = summary_by_severity.get(sev, 0) + 1

                is_low_conf = (raw.score < LOW_CONFIDENCE_THRESHOLD)

                structured_detections.append({
                    "id": idx,
                    "type": raw.label,
                    "score": raw.score,
                    "score_type": model_info.get("score_type", "model_confidence"),
                    "bbox": raw.bbox,
                    "bbox_norm": bbox_norm,
                    "location": loc,
                    "area_ratio": area_ratio,
                    "area_basis": area_basis,
                    "relative_length": rel_len,
                    "length_basis": len_basis,
                    "severity": sev,
                    "severity_reason": sev_reason,
                    "low_confidence": is_low_conf,
                    "attributes": {},
                })
                masks_for_annotation.append(raw.mask)

            if inspection_type == "crack_detection":
                overall_severity = compute_crack_overall_severity(severities_list, scores_list)
            else:
                overall_severity = compute_pothole_overall_severity(severities_list)

        low_conf_count = sum(1 for d in structured_detections if d.get("low_confidence"))
        if low_conf_count > 0:
            warnings.append("Some detections have low confidence; verify them visually.")

        tot_area_ratio = round(min(1.0, sum(d.get("area_ratio", 0.0) for d in structured_detections)), 4)

        summary_data = {
            "total_detections": len(structured_detections),
            "by_severity": summary_by_severity,
            "overall_severity": overall_severity,
            "total_area_ratio": tot_area_ratio,
            "low_confidence_count": low_conf_count,
        }

        timings["classification"] = max(1, round((time.perf_counter() - class_start) * 1000))

        # ---------------------------------------------------------------------
        # 5. Interpretation & Recommendations
        # ---------------------------------------------------------------------
        progress.set(client_request_id, "interpretation")
        interp_start = time.perf_counter()

        has_findings = len(structured_detections) > 0
        status_str = "detections_found" if has_findings else "no_detections"

        if inspection_type == "safety_detection":
            cond_indicator = compute_safety_condition_indicator(safety_metrics_data)
        else:
            cond_indicator = compute_defect_condition_indicator(structured_detections, is_classical_baseline=is_classical)

        interp_text = generate_interpretation_text(
            inspection_type,
            structured_detections,
            summary_data,
            safety_metrics=safety_metrics_data,
        )

        recs = generate_recommendations(
            inspection_type,
            overall_severity,
            has_detections=has_findings,
            warnings=warnings,
        )

        # PRD Section 15 Limitations
        general_limits = [
            "Single 2D image; no depth, scale, or material data. No structural integrity determination.",
            "Results depend on lighting, angle, distance, resolution, occlusion, and surface texture.",
            "Models may produce false positives and false negatives. No detection ≠ no defect.",
            "Severity levels and the condition indicator are heuristic visual indicators from this prototype, not engineering measurements or code-based classifications.",
        ]
        if inspection_type == "crack_detection":
            module_limits = [
                "Crack width, depth, and structural cause cannot be determined from an uncalibrated image.",
                "Classical baseline may detect dark linear features such as shadows, joints, rebar lines, markings, and texture.",
            ]
        elif inspection_type == "pothole_detection":
            module_limits = [
                "Depth and volume cannot be determined from a single 2D image.",
                "Water-filled potholes, shadows, patched repairs, and manholes may affect detection accuracy.",
            ]
        else:
            module_limits = [
                "People detected are assumed to be site personnel; the system cannot distinguish workers from visitors.",
                "Helmet detection may fail under occlusion, severe viewing angles, or small pixel resolution.",
                "Only visible helmet compliance is evaluated; other PPE (vests, boots, harnesses) is not assessed.",
            ]
        limitations = general_limits + module_limits

        timings["interpretation"] = max(1, round((time.perf_counter() - interp_start) * 1000))

        # ---------------------------------------------------------------------
        # 6. Annotation
        # ---------------------------------------------------------------------
        annot_start = time.perf_counter()
        annotated_bytes = annotate_image(
            bgr_image,
            structured_detections,
            masks_for_annotation,
            inspection_type,
        )
        timings["annotation"] = max(1, round((time.perf_counter() - annot_start) * 1000))

        # ---------------------------------------------------------------------
        # 7. Persistence & Assembly
        # ---------------------------------------------------------------------
        analysis_id = storage.generate_analysis_id()
        storage.save_image_atomic(analysis_id, "original", jpeg_bytes)
        storage.save_image_atomic(analysis_id, "annotated", annotated_bytes)

        timings["total"] = max(1, round((time.perf_counter() - overall_start) * 1000))

        created_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        result = {
            "analysis_id": analysis_id,
            "created_at": created_iso,
            "inspection_type": inspection_type,
            "image": {
                "original_filename": sanitized_filename,
                "width": img_w,
                "height": img_h,
                "original_url": f"/api/files/{analysis_id}/original",
                "annotated_url": f"/api/files/{analysis_id}/annotated",
            },
            "model": model_info,
            "status": status_str,
            "detections": structured_detections,
            "summary": summary_data,
            "safety_metrics": safety_metrics_data,
            "condition_indicator": cond_indicator,
            "interpretation": interp_text,
            "recommendations": recs,
            "warnings": warnings,
            "limitations": limitations,
            "timings_ms": timings,
            "disclaimer": DISCLAIMER_TEXT,
        }

        storage.save_result_json_atomic(analysis_id, result)
        progress.complete(client_request_id)

        return result


inference_service = InferenceService()
