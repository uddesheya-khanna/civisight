from typing import Literal, Tuple, List, Optional
from backend.app.engineering.thresholds import (
    CRACK_HIGH_LENGTH_RATIO,
    CRACK_HIGH_AREA_RATIO,
    CRACK_MODERATE_LENGTH_RATIO,
    CRACK_MODERATE_AREA_RATIO,
    CRACK_ESCALATE_COUNT_LOW_TO_MOD,
    CRACK_ESCALATE_MIN_SCORE,
    CRACK_ESCALATE_COUNT_TO_HIGH,
    POTHOLE_HIGH_AREA_RATIO,
    POTHOLE_MODERATE_AREA_RATIO,
    POTHOLE_ESCALATE_COUNT_TO_MOD,
    POTHOLE_ESCALATE_COUNT_TO_HIGH,
)

SeverityLevel = Literal["low", "moderate", "high"]

SEVERITY_ORDER = {"low": 1, "moderate": 2, "high": 3}
ORDER_TO_SEVERITY = {1: "low", 2: "moderate", 3: "high"}


def compute_crack_severity(relative_length: float, area_ratio: float) -> Tuple[SeverityLevel, str]:
    """
    Computes per-finding severity for crack detection.
    Top-down first match wins.
    """
    if relative_length >= CRACK_HIGH_LENGTH_RATIO:
        return "high", f"Relative length {relative_length:.2f} >= {CRACK_HIGH_LENGTH_RATIO:.2f}"
    if area_ratio >= CRACK_HIGH_AREA_RATIO:
        return "high", f"Area ratio {area_ratio:.3f} >= {CRACK_HIGH_AREA_RATIO:.2f}"

    if relative_length >= CRACK_MODERATE_LENGTH_RATIO:
        return "moderate", f"Relative length {relative_length:.2f} >= {CRACK_MODERATE_LENGTH_RATIO:.2f}"
    if area_ratio >= CRACK_MODERATE_AREA_RATIO:
        return "moderate", f"Area ratio {area_ratio:.3f} >= {CRACK_MODERATE_AREA_RATIO:.2f}"

    return "low", "Small/thin visible crack feature below moderate thresholds"


def compute_crack_overall_severity(
    severities: List[SeverityLevel],
    scores: List[float]
) -> Optional[SeverityLevel]:
    if not severities:
        return None

    max_rank = max(SEVERITY_ORDER[s] for s in severities)
    overall = ORDER_TO_SEVERITY[max_rank]

    # Escalation: if overall is low and >= 5 detections with score >= 0.5 -> moderate
    if overall == "low":
        high_conf_count = sum(1 for s, sc in zip(severities, scores) if sc >= CRACK_ESCALATE_MIN_SCORE)
        if high_conf_count >= CRACK_ESCALATE_COUNT_LOW_TO_MOD:
            overall = "moderate"

    # Escalation: if >= 3 detections are moderate or higher -> high
    mod_or_higher = sum(1 for s in severities if SEVERITY_ORDER[s] >= SEVERITY_ORDER["moderate"])
    if mod_or_higher >= CRACK_ESCALATE_COUNT_TO_HIGH:
        overall = "high"

    return overall


def compute_pothole_severity(area_ratio: float) -> Tuple[SeverityLevel, str]:
    """
    Computes per-finding severity for pothole detection.
    """
    if area_ratio >= POTHOLE_HIGH_AREA_RATIO:
        return "high", f"Area ratio {area_ratio:.3f} >= {POTHOLE_HIGH_AREA_RATIO:.3f}"
    if area_ratio >= POTHOLE_MODERATE_AREA_RATIO:
        return "moderate", f"Area ratio {area_ratio:.3f} >= {POTHOLE_MODERATE_AREA_RATIO:.3f}"
    return "low", "Minor visible surface distress"


def compute_pothole_overall_severity(severities: List[SeverityLevel]) -> Optional[SeverityLevel]:
    if not severities:
        return None

    max_rank = max(SEVERITY_ORDER[s] for s in severities)
    overall = ORDER_TO_SEVERITY[max_rank]

    # Escalation: if >= 3 detections -> at least moderate
    if len(severities) >= POTHOLE_ESCALATE_COUNT_TO_MOD:
        if SEVERITY_ORDER[overall] < SEVERITY_ORDER["moderate"]:
            overall = "moderate"

    # Escalation: if >= 3 detections are moderate or higher -> high
    mod_or_higher = sum(1 for s in severities if SEVERITY_ORDER[s] >= SEVERITY_ORDER["moderate"])
    if mod_or_higher >= POTHOLE_ESCALATE_COUNT_TO_HIGH:
        overall = "high"

    return overall
