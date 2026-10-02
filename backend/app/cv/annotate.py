import io
from typing import List, Dict, Any, Tuple
import cv2
import numpy as np

# BGR color palette matching PRD Sections 11.4 and 13.9
COLOR_LOW_GREEN = (61, 128, 21)        # #15803D
COLOR_MOD_AMBER = (9, 83, 180)         # #B45309
COLOR_HIGH_RED = (28, 28, 185)         # #B91C1C
COLOR_BLUE_HELMET = (138, 58, 30)      # #1E3A8A
COLOR_GRAY_MUTED = (105, 117, 128)     # #475569


def get_detection_color(
    detection: Dict[str, Any],
    inspection_type: str,
) -> Tuple[int, int, int]:
    if inspection_type == "safety_detection":
        det_type = detection.get("type", "")
        if det_type == "helmet":
            return COLOR_BLUE_HELMET

        attrs = detection.get("attributes", {})
        h_status = attrs.get("helmet_status", "")
        if h_status == "helmet_visible":
            return COLOR_LOW_GREEN
        elif h_status == "helmet_not_visibly_detected":
            return COLOR_HIGH_RED
        else:
            return COLOR_GRAY_MUTED

    sev = detection.get("severity") or "low"
    if sev == "high":
        return COLOR_HIGH_RED
    elif sev == "moderate":
        return COLOR_MOD_AMBER
    return COLOR_LOW_GREEN


def annotate_image(
    image_bgr: np.ndarray,
    detections: List[Dict[str, Any]],
    masks: List[np.ndarray],
    inspection_type: str,
) -> bytes:
    """
    Draws numbered, severity-colored bounding boxes, mask overlays, and labels.
    Returns JPEG compressed bytes at quality 90.
    """
    canvas = image_bgr.copy()
    h, w = canvas.shape[:2]

    line_thick = max(2, round(min(h, w) / 300.0))
    font_scale = max(0.45, min(h, w) / 1200.0)
    font_thick = max(1, round(line_thick * 0.75))

    # 1. Draw mask overlays first (under labels)
    for det, mask in zip(detections, masks):
        if mask is not None and mask.shape == (h, w) and np.any(mask):
            color = get_detection_color(det, inspection_type)
            colored_mask = np.zeros_like(canvas, dtype=np.uint8)
            colored_mask[mask > 0] = color
            # 35% opacity blend
            roi = canvas[mask > 0]
            canvas[mask > 0] = cv2.addWeighted(
                roi, 0.65, colored_mask[mask > 0], 0.35, 0
            )
            # Draw contour
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            cv2.drawContours(canvas, contours, -1, color, max(1, line_thick // 2))

    # 2. Draw bounding boxes and text labels
    for det in detections:
        color = get_detection_color(det, inspection_type)
        bbox = det["bbox"]
        x1, y1, x2, y2 = [int(round(v)) for v in bbox]

        # Clamp
        x1 = max(0, min(w - 1, x1))
        y1 = max(0, min(h - 1, y1))
        x2 = max(0, min(w - 1, x2))
        y2 = max(0, min(h - 1, y2))

        cv2.rectangle(canvas, (x1, y1), (x2, y2), color, line_thick)

        # Label text
        det_id = det.get("id", 1)
        det_type = det.get("type", "target")
        score = det.get("score", 0.0)
        is_heuristic = det.get("score_type") == "heuristic_score"

        if inspection_type == "safety_detection":
            if det_type == "helmet":
                label_text = f"#{det_id} helmet {score:.2f}"
            else:
                h_status = det.get("attributes", {}).get("helmet_status", "")
                if h_status == "helmet_visible":
                    label_text = f"#{det_id} person (helmet)"
                elif h_status == "helmet_not_visibly_detected":
                    label_text = f"#{det_id} person (no helmet detected)"
                else:
                    label_text = f"#{det_id} person (small)"
        else:
            if is_heuristic:
                label_text = f"#{det_id} crack ~{score:.2f}"
            else:
                label_text = f"#{det_id} {det_type} {score:.2f}"

        # Draw label background box
        (tw, th), baseline = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, font_thick)
        ty = max(y1 - 6, th + 4)
        tx = x1

        # Background rectangle for readable label
        cv2.rectangle(
            canvas,
            (tx, ty - th - 4),
            (tx + tw + 6, ty + baseline),
            color,
            -1,
        )
        # White text on colored label badge
        cv2.putText(
            canvas,
            label_text,
            (tx + 3, ty - 2),
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale,
            (255, 255, 255),
            font_thick,
            lineType=cv2.LINE_AA,
        )

    # Compress to JPEG quality 90
    encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), 90]
    success, encoded = cv2.imencode(".jpg", canvas, encode_params)
    if not success:
        raise ValueError("Failed to encode annotated image to JPEG.")

    return encoded.tobytes()
