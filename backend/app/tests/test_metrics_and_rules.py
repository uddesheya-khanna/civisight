import pytest
from backend.app.engineering.metrics import (
    normalize_bbox,
    compute_location_grid,
    compute_area_ratio,
)
from backend.app.engineering.severity import (
    compute_crack_severity,
    compute_pothole_severity,
)
from backend.app.engineering.safety import associate_people_and_helmets
from backend.app.engineering.condition import (
    compute_defect_condition_indicator,
    compute_safety_condition_indicator,
)


def test_normalize_bbox():
    bbox = [100.0, 200.0, 300.0, 400.0]
    norm = normalize_bbox(bbox, 1000, 1000)
    assert list(norm) == [0.1, 0.2, 0.3, 0.4]


def test_compute_location_grid():
    # Top left bbox
    loc = compute_location_grid([10, 10, 50, 50], 300, 300)
    assert loc == "top-left"

    # Center bbox
    loc_center = compute_location_grid([120, 120, 180, 180], 300, 300)
    assert loc_center == "center"


def test_compute_area_ratio():
    bbox = [0, 0, 100, 100]
    ratio, basis = compute_area_ratio(bbox, None, 1000, 1000)
    assert ratio == 0.01
    assert basis == "bbox"


def test_compute_pothole_severity():
    sev_low, _ = compute_pothole_severity(0.005)
    assert sev_low == "low"
    sev_mod, _ = compute_pothole_severity(0.03)
    assert sev_mod == "moderate"
    sev_high, _ = compute_pothole_severity(0.10)
    assert sev_high == "high"


def test_associate_people_and_helmets():
    # One person, one helmet directly in head region
    person_box = [100.0, 100.0, 200.0, 400.0]
    helmet_box = [120.0, 100.0, 180.0, 160.0]

    statuses, metrics, overall = associate_people_and_helmets(
        [person_box], [helmet_box], 1000, helmet_model_available=True
    )
    assert statuses == ["helmet_visible"]
    assert metrics["people_detected"] == 1
    assert metrics["people_with_visible_helmet"] == 1
    assert metrics["visible_helmet_compliance_pct"] == 100.0
    assert overall == "low"

    # One person, no helmets
    statuses2, metrics2, overall2 = associate_people_and_helmets(
        [person_box], [], 1000, helmet_model_available=True
    )
    assert statuses2 == ["helmet_not_visibly_detected"]
    assert metrics2["people_detected"] == 1
    assert metrics2["people_without_visible_helmet"] == 1
    assert metrics2["visible_helmet_compliance_pct"] == 0.0
    assert overall2 == "high"


def test_condition_indicator():
    # No detections -> value is None
    res = compute_defect_condition_indicator([], is_classical_baseline=False)
    assert res["value"] is None

    # One high severity defect
    sample_det = [{"severity": "high", "area_ratio": 0.02}]
    res2 = compute_defect_condition_indicator(sample_det, is_classical_baseline=False)
    assert res2["value"] is not None
    assert res2["value"] < 100
    assert res2["band"] in ["green", "amber", "red"]
