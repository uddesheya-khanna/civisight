from fastapi import APIRouter
from backend.app.schemas import HealthResponse
from backend.app.config import settings
from backend.app.cv.registry import registry

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    modules_desc = registry.describe_modules()
    device = registry.device
    if device == "auto":
        try:
            import torch
            device = "cuda:0" if torch.cuda.is_available() else "cpu"
        except Exception:
            device = "cpu"

    return HealthResponse(
        status="ok",
        version="1.0.0",
        device=device,
        modules=modules_desc,
        limits={
            "max_upload_mb": settings.max_upload_mb,
            "allowed_types": ["jpg", "jpeg", "png", "webp"],
        },
    )
