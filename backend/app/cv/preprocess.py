import io
from typing import Tuple
from PIL import Image, ImageOps
import numpy as np
import cv2
from backend.app.config import settings


def preprocess_image(
    img: Image.Image,
    max_dim: int = settings.max_image_dim
) -> Tuple[np.ndarray, bytes, int, int, float]:
    """
    Applies EXIF transpose, converts to RGB, downscales if long side > max_dim,
    and returns:
    - bgr_image: np.ndarray (H, W, 3) in BGR for OpenCV / YOLO
    - jpeg_bytes: bytes of normalized original.jpg (q92)
    - width: int
    - height: int
    - scale_factor: float (original_size / processed_size)
    """
    # 1. Apply EXIF orientation
    img = ImageOps.exif_transpose(img)

    # 2. Convert to RGB (handles RGBA, grayscale, etc.)
    if img.mode != "RGB":
        img = img.convert("RGB")

    orig_w, orig_h = img.size
    long_side = max(orig_w, orig_h)
    scale_factor = 1.0

    if long_side > max_dim:
        scale_factor = float(long_side) / float(max_dim)
        if orig_w >= orig_h:
            new_w = max_dim
            new_h = max(1, round(orig_h / scale_factor))
        else:
            new_h = max_dim
            new_w = max(1, round(orig_w / scale_factor))
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    proc_w, proc_h = img.size

    # 3. Save as JPEG quality 92 (strips EXIF / payload metadata)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=92, optimize=True)
    jpeg_bytes = buf.getvalue()

    # 4. Convert PIL RGB to OpenCV BGR numpy array
    rgb_arr = np.array(img, dtype=np.uint8)
    bgr_arr = cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2BGR)

    return bgr_arr, jpeg_bytes, proc_w, proc_h, scale_factor
