from datetime import datetime, timezone
from fastapi import APIRouter, Response
from backend.app.services.report_service import report_service
from backend.app.core.storage import storage

router = APIRouter(tags=["report"])


@router.post("/report/{analysis_id}")
def generate_report(analysis_id: str) -> Response:
    result = storage.load_result_json(analysis_id)
    pdf_bytes = report_service.generate_pdf(analysis_id)

    mod = result.get("inspection_type", "inspection").replace("_detection", "")
    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")
    filename = f"CiviSight_Report_{mod}_{timestamp_str}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )
