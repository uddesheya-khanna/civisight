from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form
from backend.app.schemas import AnalysisResult, ProgressResponse
from backend.app.services.inference_service import inference_service
from backend.app.core.progress import progress
from backend.app.core.errors import not_found_error, file_too_large_error, bad_request_error
from backend.app.config import settings

router = APIRouter(tags=["analyze"])


@router.post("/analyze", response_model=AnalysisResult)
def analyze_image(
    image: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None),
    inspection_type: str = Form(...),
    client_request_id: Optional[str] = Form(None),
) -> AnalysisResult:
    target_file = image or file
    if target_file is None:
        raise bad_request_error("An image file must be uploaded under field 'image' or 'file'.")

    # Cap reading bytes
    max_bytes = settings.max_upload_mb * 1024 * 1024
    raw_bytes = target_file.file.read(max_bytes + 1024)
    if len(raw_bytes) > max_bytes:
        raise file_too_large_error(settings.max_upload_mb)

    filename = target_file.filename or "uploaded_image.jpg"

    result = inference_service.run_pipeline(
        raw_bytes=raw_bytes,
        filename=filename,
        inspection_type=inspection_type,
        client_request_id=client_request_id,
    )
    return AnalysisResult(**result)


@router.get("/progress/{client_request_id}", response_model=ProgressResponse)
def get_progress(client_request_id: str) -> ProgressResponse:
    state = progress.get(client_request_id)
    if not state:
        raise not_found_error("No active analysis for this request ID.")
    return ProgressResponse(**state)
