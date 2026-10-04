from fastapi import APIRouter
from backend.app.schemas import HealthResponse
from backend.app.config import settings
from backend.app.cv.registry import registry

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """
    Lightweight health check endpoint.

    CRITICAL: must NOT load any YOLO model.
    describe_modules() checks file existence only — no weights are read.
    This endpoint must respond quickly even on a cold-started free instance.
    """
    modules_desc = registry.describe_modules()

    # Resolve display device without importing torch unless already imported
    device = registry.device
    if device == "auto":
        try:
            import sys
            if "torch" in sys.modules:
                import torch
                device = "cuda:0" if torch.cuda.is_available() else "cpu"
            else:
                device = "cpu"
        except Exception:
            device = "cpu"

    return HealthResponse(
        status="ok",
        version="1.0.0",
        environment=settings.app_env,
        device=device,
        modules=modules_desc,
        limits={
            "max_upload_mb": settings.max_upload_mb,
            "allowed_types": ["jpg", "jpeg", "png", "webp"],
        },
    )
