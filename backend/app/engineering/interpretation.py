from typing import Dict, Any, List, Optional


def generate_interpretation_text(
    inspection_type: str,
    detections: List[Dict[str, Any]],
    summary: Dict[str, Any],
    safety_metrics: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Templated civil engineering interpretation text computed from real numbers.
    PRD Section 11.7.
    """
    n = len(detections)
    if n == 0:
        return "No significant target was detected."

    if inspection_type == "crack_detection":
        by_sev = summary.get("by_severity", {})
        k_high = by_sev.get("high", 0)
        k_mod = by_sev.get("moderate", 0)
        k_low = by_sev.get("low", 0)

        parts = []
        if k_high > 0:
            parts.append(f"{k_high} as high")
        if k_mod > 0:
            parts.append(f"{k_mod} as moderate")
        if k_low > 0:
            parts.append(f"{k_low} as low")

        dist_str = ", ".join(parts) + " visual concern" if parts else "varying visual concern"
        plural = "region was" if n == 1 else "regions were"
        return (
            f"{n} visible crack {plural} detected ({dist_str}). "
            "Professional inspection is recommended before making structural decisions."
        )

    elif inspection_type == "pothole_detection":
        tot_area = summary.get("total_area_ratio", 0.0)
        pct = round(tot_area * 100.0, 1)
        overall = summary.get("overall_severity", "low")
        plural = "region was" if n == 1 else "regions were"
        return (
            f"{n} visible road-surface damage {plural} detected, covering approximately {pct}% "
            f"of the image area. Preliminary maintenance priority: {overall}."
        )

    elif inspection_type == "safety_detection":
        if not safety_metrics:
            return f"{n} safety-related detections were identified."

        p = safety_metrics.get("people_detected", 0)
        p_plural = "person was" if p == 1 else "people were"
        if not safety_metrics.get("helmet_model_available", False):
            return (
                f"{p} {p_plural} detected. Helmet compliance analysis is unavailable "
                "because the helmet detection model is not installed on the server."
            )

        h = safety_metrics.get("people_with_visible_helmet", 0)
        m = safety_metrics.get("people_without_visible_helmet", 0)
        c = safety_metrics.get("visible_helmet_compliance_pct")
        c_str = f"{c:.1f}%" if c is not None else "N/A"

        return (
            f"{p} {p_plural} detected; {h} with a visible helmet and {m} without a visibly detected "
            f"helmet (visible helmet compliance {c_str}). Occlusion and resolution may affect these results."
        )

    return f"{n} detections were identified."
