import math
from typing import Tuple, List, Dict, Any, Optional, Literal
from backend.app.engineering.thresholds import (
    SAFETY_ASSESSABLE_MIN_HEIGHT_RATIO,
    SAFETY_HEAD_REGION_X_TOLERANCE,
    SAFETY_HEAD_REGION_Y_TOP_OFFSET,
    SAFETY_HEAD_REGION_Y_BOTTOM_OFFSET,
    SAFETY_COMPLIANCE_HIGH_THRESHOLD,
    SAFETY_COMPLIANCE_FULL_THRESHOLD,
)

HelmetStatus = Literal["helmet_visible", "helmet_not_visibly_detected", "not_assessable_small"]
SeverityLevel = Literal["low", "moderate", "high"]


def is_person_assessable(person_bbox: Tuple[float, float, float, float], img_h: int) -> bool:
    _, y1, _, y2 = person_bbox
    height = y2 - y1
    min_h = SAFETY_ASSESSABLE_MIN_HEIGHT_RATIO * float(max(1, img_h))
    return height >= min_h


def get_head_region(
    person_bbox: Tuple[float, float, float, float]
) -> Tuple[float, float, float, float, float, float]:
    """
    Returns (x_min, y_min, x_max, y_max, center_x, center_y) for head region.
    """
    x1, y1, x2, y2 = person_bbox
    w = max(0.0, x2 - x1)
    h = max(0.0, y2 - y1)

    x_min = x1 - SAFETY_HEAD_REGION_X_TOLERANCE * w
    x_max = x2 + SAFETY_HEAD_REGION_X_TOLERANCE * w
    y_min = y1 - SAFETY_HEAD_REGION_Y_TOP_OFFSET * h
    y_max = y1 + SAFETY_HEAD_REGION_Y_BOTTOM_OFFSET * h

    hr_cx = (x1 + x2) / 2.0
    hr_cy = (y_min + y_max) / 2.0
    return x_min, y_min, x_max, y_max, hr_cx, hr_cy


def associate_people_and_helmets(
    people_boxes: List[Tuple[float, float, float, float]],
    helmet_boxes: List[Tuple[float, float, float, float]],
    img_h: int,
    helmet_model_available: bool,
) -> Tuple[List[HelmetStatus], Dict[str, Any], Optional[SeverityLevel]]:
    """
    Associates people with helmets and computes compliance metrics.
    """
    n_people = len(people_boxes)
    n_helmets = len(helmet_boxes)

    # Determine assessability
    assessable_flags = [is_person_assessable(b, img_h) for b in people_boxes]
    people_assessable = sum(1 for a in assessable_flags if a)
    people_not_assessable = n_people - people_assessable

    if not helmet_model_available:
        statuses: List[HelmetStatus] = [
            "not_assessable_small" if not a else "helmet_not_visibly_detected"
            for a in assessable_flags
        ]
        metrics = {
            "people_detected": n_people,
            "people_assessable": people_assessable,
            "people_not_assessable": people_not_assessable,
            "helmets_detected": 0,
            "people_with_visible_helmet": 0,
            "people_without_visible_helmet": people_assessable,
            "visible_helmet_compliance_pct": None,
            "helmet_model_available": False,
        }
        return statuses, metrics, None

    # Greedy matching of assessable people to helmets
    # Compute candidate pairs (distance, person_idx, helmet_idx)
    candidates = []
    for p_idx, (p_box, is_ass) in enumerate(zip(people_boxes, assessable_flags)):
        if not is_ass:
            continue
        x_min, y_min, x_max, y_max, hr_cx, hr_cy = get_head_region(p_box)
        for h_idx, h_box in enumerate(helmet_boxes):
            hx = (h_box[0] + h_box[2]) / 2.0
            hy = (h_box[1] + h_box[3]) / 2.0
            if x_min <= hx <= x_max and y_min <= hy <= y_max:
                dist = math.hypot(hx - hr_cx, hy - hr_cy)
                candidates.append((dist, p_idx, h_idx))

    # Sort candidates by distance
    candidates.sort(key=lambda c: c[0])

    matched_people = set()
    matched_helmets = set()

    for dist, p_idx, h_idx in candidates:
        if p_idx not in matched_people and h_idx not in matched_helmets:
            matched_people.add(p_idx)
            matched_helmets.add(h_idx)

    # Assign statuses
    statuses: List[HelmetStatus] = []
    for p_idx, is_ass in enumerate(assessable_flags):
        if not is_ass:
            statuses.append("not_assessable_small")
        elif p_idx in matched_people:
            statuses.append("helmet_visible")
        else:
            statuses.append("helmet_not_visibly_detected")

    people_with_helmet = len(matched_people)
    people_without_helmet = people_assessable - people_with_helmet

    compliance_pct = None
    overall_sev: Optional[SeverityLevel] = None

    if people_assessable > 0:
        compliance_pct = round(100.0 * people_with_helmet / float(people_assessable), 1)
        if compliance_pct >= SAFETY_COMPLIANCE_FULL_THRESHOLD:
            overall_sev = "low"
        elif compliance_pct >= SAFETY_COMPLIANCE_HIGH_THRESHOLD:
            overall_sev = "moderate"
        else:
            overall_sev = "high"

    metrics = {
        "people_detected": n_people,
        "people_assessable": people_assessable,
        "people_not_assessable": people_not_assessable,
        "helmets_detected": n_helmets,
        "people_with_visible_helmet": people_with_helmet,
        "people_without_visible_helmet": people_without_helmet,
        "visible_helmet_compliance_pct": compliance_pct,
        "helmet_model_available": True,
    }

    return statuses, metrics, overall_sev
