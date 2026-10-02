import math
from typing import Tuple, Literal, Optional
import numpy as np


def compute_bbox_center(bbox: Tuple[float, float, float, float]) -> Tuple[float, float]:
    x1, y1, x2, y2 = bbox
    return (x1 + x2) / 2.0, (y1 + y2) / 2.0


def compute_location_grid(bbox: Tuple[float, float, float, float], img_w: int, img_h: int) -> str:
    """
    Computes 3x3 location grid label:
    top-left, top-center, top-right,
    middle-left, center, middle-right,
    bottom-left, bottom-center, bottom-right.
    """
    cx, cy = compute_bbox_center(bbox)
    rel_x = max(0.0, min(1.0, cx / max(1, img_w)))
    rel_y = max(0.0, min(1.0, cy / max(1, img_h)))

    if rel_y < 1.0 / 3.0:
        row = "top"
    elif rel_y < 2.0 / 3.0:
        row = "middle"
    else:
        row = "bottom"

    if rel_x < 1.0 / 3.0:
        col = "left"
    elif rel_x < 2.0 / 3.0:
        col = "center"
    else:
        col = "right"

    if row == "middle" and col == "center":
        return "center"
    return f"{row}-{col}"


def compute_area_ratio(
    bbox: Tuple[float, float, float, float],
    mask: Optional[np.ndarray],
    img_w: int,
    img_h: int
) -> Tuple[float, Literal["mask", "bbox"]]:
    """
    area_ratio = detection area / image area.
    Area basis: mask area if mask exists, else bbox area.
    """
    img_area = float(max(1, img_w * img_h))
    if mask is not None:
        mask_area = float(np.count_nonzero(mask))
        return round(mask_area / img_area, 4), "mask"

    x1, y1, x2, y2 = bbox
    box_w = max(0.0, x2 - x1)
    box_h = max(0.0, y2 - y1)
    box_area = box_w * box_h
    return round(box_area / img_area, 4), "bbox"


def compute_relative_length(
    bbox: Tuple[float, float, float, float],
    skeleton_length_px: Optional[float],
    img_w: int,
    img_h: int
) -> Tuple[float, Literal["skeleton", "bbox_diagonal"]]:
    """
    relative_length (cracks): skeleton_length_px / image_diagonal when available,
    otherwise bbox_diagonal / image_diagonal.
    """
    img_diag = math.sqrt(img_w * img_w + img_h * img_h)
    if img_diag <= 0:
        return 0.0, "bbox_diagonal"

    if skeleton_length_px is not None and skeleton_length_px > 0:
        return round(skeleton_length_px / img_diag, 4), "skeleton"

    x1, y1, x2, y2 = bbox
    box_w = max(0.0, x2 - x1)
    box_h = max(0.0, y2 - y1)
    box_diag = math.sqrt(box_w * box_w + box_h * box_h)
    return round(box_diag / img_diag, 4), "bbox_diagonal"


def normalize_bbox(
    bbox: Tuple[float, float, float, float],
    img_w: int,
    img_h: int
) -> Tuple[float, float, float, float]:
    x1, y1, x2, y2 = bbox
    w = max(1, img_w)
    h = max(1, img_h)
    return (
        round(max(0.0, min(1.0, x1 / w)), 4),
        round(max(0.0, min(1.0, y1 / h)), 4),
        round(max(0.0, min(1.0, x2 / w)), 4),
        round(max(0.0, min(1.0, y2 / h)), 4),
    )
