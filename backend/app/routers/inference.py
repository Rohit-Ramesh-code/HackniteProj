from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from app.services.gemini_service import GeminiService

router = APIRouter(prefix="/api/inference", tags=["Gemini AI Inference"])

@router.post("/evaluate-feed")
async def evaluate_surveillance_feed(
    file: UploadFile = File(...),
    recipient_email: Optional[str] = Form("security-ops@aegis-spatial.local"),
    camera_id: Optional[str] = Form("CAM-01-OPTIMIZED")
):
    """
    Ingest WebM video blob recorded from virtual cameras, evaluate threat using Gemini 1.5 Flash,
    and automatically dispatch SMTP email alert ONLY when threat is confirmed.
    """
    if not file.content_type.startswith("video/") and not file.filename.endswith(".webm"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a WebM video format")

    try:
        video_bytes = await file.read()
        if len(video_bytes) == 0:
            raise HTTPException(status_code=400, detail="Video payload is empty")

        result = await GeminiService.evaluate_video_feed(
            video_bytes=video_bytes,
            recipient_email=recipient_email,
            camera_id=camera_id
        )

        return result
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini AI evaluation failed: {str(e)}")
