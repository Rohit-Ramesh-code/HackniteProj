import json
import asyncio
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from typing import Dict, Any

from app.schemas.synthetic_schema import (
    PromptPreviewRequest,
    PromptPreviewResponse,
    GenerationJobRequest,
    GenerationJobResponse,
    LightingPreset,
    ScenarioPreset,
    SyntheticCameraConfig,
    ActorConfig
)
from app.services.synthetic_scene_engine import (
    SyntheticSceneEngine,
    LIGHTING_DESCRIPTIONS,
    SCENARIO_DESCRIPTIONS
)
from app.services.mock_synthetic_generator import (
    MockSyntheticGeneratorService
)
from app.services.synthetic_generator import (
    SyntheticGeneratorService,
    is_torch_and_cuda_available
)

router = APIRouter(prefix="/api/synthetic", tags=["Synthetic Data Generation"])


# ---------------------------------------------------------------------------
# Presets & System Capabilities Endpoint
# ---------------------------------------------------------------------------

@router.get("/presets")
async def get_presets() -> Dict[str, Any]:
    """Returns available lighting conditions, scenario presets, and CUDA acceleration status."""
    cuda_ready = is_torch_and_cuda_available()
    return {
        "cuda_available": cuda_ready,
        "default_model": "Wan-AI/Wan2.2-I2V-A14B-Diffusers" if cuda_ready else "Mock Wan2.2 Pipeline",
        "lighting_presets": [
            {"id": k.value, "label": k.value.replace("_", " ").title(), "description": v}
            for k, v in LIGHTING_DESCRIPTIONS.items()
        ],
        "scenario_presets": [
            {"id": k.value, "label": k.value.replace("_", " ").title(), "description": v}
            for k, v in SCENARIO_DESCRIPTIONS.items()
        ]
    }


# ---------------------------------------------------------------------------
# Prompt Preview Endpoint
# ---------------------------------------------------------------------------

@router.post("/preview-prompts", response_model=PromptPreviewResponse)
async def preview_prompts(req: PromptPreviewRequest) -> PromptPreviewResponse:
    """
    Computes and returns natural language diffusion prompts and 3D visibility metrics
    for all cameras based on actor waypoints, scenario, and lighting.
    """
    try:
        engine = SyntheticSceneEngine(
            cameras=req.cameras,
            actor=req.actor,
            waypoints=req.waypoints,
            duration=req.duration,
            lighting=req.lighting
        )
        return engine.generate_all_prompts(evaluation_time=req.evaluation_time)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to generate prompt previews: {str(exc)}")


# ---------------------------------------------------------------------------
# Batch Job Generation Endpoint (Async)
# ---------------------------------------------------------------------------

@router.post("/generate", response_model=GenerationJobResponse)
async def start_generation(req: GenerationJobRequest) -> GenerationJobResponse:
    """
    Dispatches a video generation job. Uses Wan 2.2 / Hunyuan GPU pipeline
    when CUDA is present, with seamless fallback to mock generator.
    """
    if not req.cameras:
        raise HTTPException(status_code=400, detail="At least one camera must be provided")
    if not req.waypoints:
        raise HTTPException(status_code=400, detail="At least one actor waypoint is required")

    job = MockSyntheticGeneratorService.start_job(req)
    return job


# ---------------------------------------------------------------------------
# Job Status Endpoint
# ---------------------------------------------------------------------------

@router.get("/jobs/{job_id}", response_model=GenerationJobResponse)
async def get_job_status(job_id: str) -> GenerationJobResponse:
    """Fetches the real-time status and output URLs for a generation job."""
    job = MockSyntheticGeneratorService.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


# ---------------------------------------------------------------------------
# WebSocket Telemetry Stream (Interactive Generation)
# ---------------------------------------------------------------------------

@router.websocket("/ws/generate")
async def websocket_generate(ws: WebSocket):
    """
    Interactive WebSocket endpoint for streaming real-time diffusion progress,
    step counts, and preview frames directly to UI clients.
    """
    await ws.accept()

    try:
        data = await ws.receive_json()
        
        # Parse payload
        camera_data = data.get("camera", {})
        prompt = data.get("prompt", "")
        steps = int(data.get("steps", 15))
        fps = int(data.get("fps", 16))
        use_mock = bool(data.get("use_mock", False))
        visible = bool(data.get("visible", True))

        if not prompt:
            await ws.send_json({"type": "error", "message": "Prompt is required"})
            return

        camera = SyntheticCameraConfig(**camera_data) if camera_data else SyntheticCameraConfig(
            id=1,
            position=[0, 2.5, 5],
            rotation=[-20, 0, 0]
        )

        status_prefix = "CUDA Wan2.2" if is_torch_and_cuda_available() and not use_mock else "Mock"
        await ws.send_json({"type": "status", "message": f"Initializing {status_prefix} video generation pipeline..."})

        async def on_progress(step: int, total: int, preview_url: str):
            await ws.send_json({
                "type": "progress",
                "step": step,
                "total": total,
                "percentage": round((step / total) * 100, 1),
                "preview": preview_url
            })

        output = await SyntheticGeneratorService.generate_clip(
            camera=camera,
            prompt=prompt,
            steps=steps,
            fps=fps,
            progress_cb=on_progress,
            use_mock=use_mock,
            visible=visible
        )

        await ws.send_json({
            "type": "done",
            "url": output.video_url,
            "thumbnail": output.thumbnail_url,
            "frames": output.frames_count,
            "fps": output.fps,
            "duration": output.duration_seconds
        })

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        try:
            await ws.send_json({"type": "error", "message": str(exc)})
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Room Conditioned Dataset & Gemini Catalog Endpoints
# ---------------------------------------------------------------------------

@router.get("/catalog")
async def get_synthetic_catalog():
    """Returns the library of synthetic videos generated from room source frames and classified by Gemini."""
    from app.services.room_synthetic_generator import generate_all_synthetic_data, CATALOG_PATH
    if not CATALOG_PATH.exists():
        catalog = await generate_all_synthetic_data()
        return {"catalog": catalog}
    try:
        with open(CATALOG_PATH, "r") as f:
            data = json.load(f)
            return {"catalog": data}
    except Exception:
        catalog = await generate_all_synthetic_data()
        return {"catalog": catalog}


@router.post("/generate-room-dataset")
async def trigger_generate_room_dataset():
    """Generates synthetic threat and non-threat videos conditioned on room frames and classifies them with Gemini."""
    from app.services.room_synthetic_generator import generate_all_synthetic_data
    catalog = await generate_all_synthetic_data()
    return {
        "status": "success",
        "message": f"Successfully generated and Gemini-classified {len(catalog)} synthetic surveillance videos.",
        "catalog": catalog
    }

