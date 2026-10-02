from typing import Optional, List, Dict, Any, Literal
from backend.app.engineering.thresholds import (
    CONDITION_WEIGHTS,
    CONDITION_MAX_FINDING_PENALTY,
    CONDITION_MAX_AREA_PENALTY,
    CONDITION_AREA_MULTIPLIER,
    CONDITION_BAND_GREEN_MIN,
    CONDITION_BAND_AMBER_MIN,
)

BandColor = Literal["green", "amber", "red"]


def get_band(value: Optional[int]) -> Optional[BandColor]:
    if value is None:
        return None
    if value >= CONDITION_BAND_GREEN_MIN:
        return "green"
    elif value >= CONDITION_BAND_AMBER_MIN:
        return "amber"
    else:
        return "red"


def compute_defect_condition_indicator(
    detections: List[Dict[str, Any]],
    is_classical_baseline: bool = False
) -> Dict[str, Any]:
    """
    Computes AI-Assisted Visual Condition Indicator (0-100) for defects (crack/pothole).
    Formula ID: defect_v1
    """
    if not detections:
        return {
            "label": "AI-Assisted Visual Condition Indicator",
            "value": None,
            "max": 100,
            "formula_id": "defect_v1",
            "band": None,
            "factors": [],
            "explanation": "Not computed — no significant target detected. This is not an indication of good condition.",
        }

    raw_finding_penalty = 0.0
    factor_items = []

    for d in detections:
        sev = d.get("severity") or "low"
        score = float(d.get("score", 0.0))
        weight = CONDITION_WEIGHTS.get(sev, 4)
        contrib = weight * score
        raw_finding_penalty += contrib
        factor_items.append({
            "name": f"Finding #{d.get('id', '?')} penalty",
            "detail": f"{sev} × {score:.2f}",
            "penalty": round(contrib, 2),
        })

    finding_penalty = min(CONDITION_MAX_FINDING_PENALTY, raw_finding_penalty)

    total_area_ratio = min(1.0, sum(float(d.get("area_ratio", 0.0)) for d in detections))
    raw_area_penalty = CONDITION_AREA_MULTIPLIER * total_area_ratio
    area_penalty = min(CONDITION_MAX_AREA_PENALTY, raw_area_penalty)

    indicator_val = max(0, min(100, round(100.0 - finding_penalty - area_penalty)))
    band = get_band(indicator_val)

    summary_factors = [
        {
            "name": "Finding penalty",
            "detail": f"Sum of finding weights × score (capped at {int(CONDITION_MAX_FINDING_PENALTY)})",
            "penalty": round(finding_penalty, 2),
        },
        {
            "name": "Visible damage area penalty",
            "detail": f"Total area ratio {total_area_ratio:.4f} × {int(CONDITION_AREA_MULTIPLIER)} (capped at {int(CONDITION_MAX_AREA_PENALTY)})",
            "penalty": round(area_penalty, 2),
        },
    ]

    explanation = "Derived from finding severity, detection score, and visible damage area. Not a structural safety score."
    if is_classical_baseline:
        explanation += " Computed from heuristic detection scores."

    return {
        "label": "AI-Assisted Visual Condition Indicator",
        "value": indicator_val,
        "max": 100,
        "formula_id": "defect_v1",
        "band": band,
        "factors": summary_factors,
        "explanation": explanation,
    }


def compute_safety_condition_indicator(
    safety_metrics: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Computes AI-Assisted Visual Condition Indicator (0-100) for safety module.
    Formula ID: safety_v1
    """
    if not safety_metrics or safety_metrics.get("visible_helmet_compliance_pct") is None:
        return {
            "label": "AI-Assisted Visual Condition Indicator",
            "value": None,
            "max": 100,
            "formula_id": "safety_v1",
            "band": None,
            "factors": [],
            "explanation": "Not computed — helmet compliance not available or no assessable people detected.",
        }

    compliance = safety_metrics["visible_helmet_compliance_pct"]
    val = max(0, min(100, round(compliance)))
    band = get_band(val)

    factors = [
        {
            "name": "Visible helmet compliance",
            "detail": f"{safety_metrics['people_with_visible_helmet']} of {safety_metrics['people_assessable']} assessable people with visible helmet",
            "penalty": round(100.0 - compliance, 1),
        }
    ]

    return {
        "label": "AI-Assisted Visual Condition Indicator",
        "value": val,
        "max": 100,
        "formula_id": "safety_v1",
        "band": band,
        "factors": factors,
        "explanation": "Directly reflects visible helmet compliance among assessable site personnel. Not an overall site safety score.",
    }
