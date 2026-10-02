from typing import List, Dict, Optional, Literal

RecommendationItem = Dict[str, str]  # {"level": "low"|"moderate"|"high"|"info", "text": "..."}


def generate_recommendations(
    inspection_type: str,
    overall_severity: Optional[str],
    has_detections: bool,
    warnings: Optional[List[str]] = None,
) -> List[RecommendationItem]:
    """
    Deterministic civil engineering preliminary guidance generator.
    Verbatim text from PRD Section 11.6.
    """
    recs: List[RecommendationItem] = []
    warnings = warnings or []

    if not has_detections or overall_severity is None:
        recs.append({
            "level": "info",
            "text": (
                "No significant target was detected. This does not confirm the absence of defects. "
                "If there is any concern, arrange a manual inspection or retake the image with better lighting "
                "and a closer view."
            ),
        })
    elif overall_severity == "low":
        recs.append({
            "level": "low",
            "text": "Continue routine monitoring. No major visible issues were identified by the AI system.",
        })
    elif overall_severity == "moderate":
        recs.append({
            "level": "moderate",
            "text": "Consider scheduling a detailed inspection and documenting the affected area.",
        })
    elif overall_severity == "high":
        recs.append({
            "level": "high",
            "text": "Professional engineering inspection is recommended. The AI system has identified significant visible concerns.",
        })

    # Module-specific additional bullets when detections exist
    if has_detections:
        if inspection_type == "crack_detection":
            recs.append({
                "level": "info",
                "text": "Photograph affected areas with a scale reference (e.g., a ruler) and record location and date for monitoring over time.",
            })
            recs.append({
                "level": "info",
                "text": "Look for signs of growth, moisture, staining, or displacement during follow-up.",
            })
        elif inspection_type == "pothole_detection":
            recs.append({
                "level": "info",
                "text": "Mark or restrict the affected area according to your organization's road-maintenance procedures.",
            })
            recs.append({
                "level": "info",
                "text": "Record location and approximate extent for maintenance prioritization.",
            })
        elif inspection_type == "safety_detection":
            recs.append({
                "level": "info",
                "text": "A supervisor should verify helmet use on site; this image-based result may miss helmets that are occluded or too small to resolve.",
            })

    # Low-confidence flag recommendation
    has_low_conf = any("low confidence" in w.lower() for w in warnings)
    if has_low_conf:
        recs.append({
            "level": "info",
            "text": "Some detections have low confidence; verify them visually.",
        })

    # Mandatory closing disclaimer
    recs.append({
        "level": "info",
        "text": "This output is an AI-assisted preliminary observation and must not be used as a substitute for engineering judgment.",
    })

    return recs
