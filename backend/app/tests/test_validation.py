import io
import pytest
from PIL import Image
from backend.app.core.validation import validate_image_file, verify_magic_bytes
from backend.app.core.errors import AppError


def test_validate_image_file_valid():
    # Create valid JPEG
    img = Image.new("RGB", (200, 200), color="red")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    raw = buf.getvalue()

    pil_img, sanitized = validate_image_file(raw, "test.jpg")
    assert pil_img is not None
    assert pil_img.size == (200, 200)
    assert sanitized == "test.jpg"


def test_validate_image_bytes_invalid_magic():
    # Text content pretending to be jpg
    fake = b"Not an image at all"
    with pytest.raises(AppError) as exc_info:
        verify_magic_bytes(fake)
    assert exc_info.value.code == "UNSUPPORTED_MEDIA_TYPE" or exc_info.value.code == "CORRUPT_IMAGE"


def test_validate_image_bytes_too_small():
    # Smaller than 64x64
    img = Image.new("RGB", (32, 32), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    raw = buf.getvalue()

    with pytest.raises(AppError) as exc_info:
        validate_image_file(raw, "tiny.jpg")
    assert exc_info.value.code == "IMAGE_TOO_SMALL"
