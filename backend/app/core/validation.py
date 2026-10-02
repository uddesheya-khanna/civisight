import io
import re
from typing import Tuple
from PIL import Image
from backend.app.core.errors import (
    unsupported_media_type_error,
    file_too_large_error,
    corrupt_image_error,
    image_too_small_error,
)
from backend.app.config import settings

# Decompression bomb guard
Image.MAX_IMAGE_PIXELS = 50_000_000

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_MIMES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/octet-stream",  # some clients send this for images
}


def sanitize_filename(filename: str) -> str:
    """
    Sanitize client filename for safe display and PDF report metadata.
    Never used for filesystem paths.
    """
    if not filename:
        return "unnamed_image.jpg"
    # Remove control characters and path traversal / directory separators
    clean = re.sub(r'[\r\n\t\0\\/\:\*\?\"\<\>\|]', '_', filename)
    clean = clean.strip().strip('.')
    if len(clean) > 100:
        # Keep extension
        parts = clean.rsplit('.', 1)
        if len(parts) == 2:
            base, ext = parts
            clean = base[: 100 - len(ext) - 1] + '.' + ext
        else:
            clean = clean[:100]
    return clean or "unnamed_image.jpg"


def verify_magic_bytes(data: bytes) -> str:
    """
    Verify magic bytes and return normalized format ('jpeg', 'png', 'webp').
    Raises AppError if invalid.
    """
    if len(data) < 12:
        raise corrupt_image_error()

    # JPEG: starts with FF D8 FF
    if data[:3] == b"\xff\xd8\xff":
        return "jpeg"

    # PNG: starts with 89 50 4E 47 0D 0A 1A 0A
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"

    # WEBP: starts with RIFF....WEBP
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"

    raise unsupported_media_type_error()


def validate_image_file(raw_bytes: bytes, filename: str) -> Tuple[Image.Image, str]:
    """
    Validates uploaded file: size, magic bytes, extension, Pillow verify, min dimensions.
    Returns (Pillow Image object, sanitized filename).
    """
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(raw_bytes) > max_bytes:
        raise file_too_large_error(settings.max_upload_mb)

    # Check extension
    sanitized = sanitize_filename(filename)
    ext = sanitized.rsplit(".", 1)[-1].lower() if "." in sanitized else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise unsupported_media_type_error()

    # Check magic bytes
    verify_magic_bytes(raw_bytes)

    # Decode and verify with Pillow
    try:
        buf = io.BytesIO(raw_bytes)
        with Image.open(buf) as test_img:
            test_img.verify()
    except Exception:
        raise corrupt_image_error()

    # Re-open for actual reading
    try:
        buf = io.BytesIO(raw_bytes)
        img = Image.open(buf)
        img.load()
    except Exception:
        raise corrupt_image_error()

    width, height = img.size
    if width < 64 or height < 64:
        raise image_too_small_error()

    return img, sanitized
