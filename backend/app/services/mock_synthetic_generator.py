import asyncio
import base64
import io
import time
import uuid
from typing import Dict, Optional, Callable, List
from PIL import Image, ImageDraw, ImageFont
import numpy as np

from app.schemas.synthetic_schema import (
    GenerationJobRequest,
    GenerationJobResponse,
    CameraVideoOutput,
    SyntheticCameraConfig,
    LightingPreset
)
from app.services.synthetic_scene_engine import SyntheticSceneEngine

# In-memory storage for jobs
_JOB_STORE: Dict[str, GenerationJobResponse] = {}

def create_mock_preview_frame(
    camera_id: str | int,
    prompt: str,
    step: int,
    total_steps: int,
    width: int = 480,
    height: int = 270,
    visible: bool = True
) -> Image.Image:
    """Generates a synthetic mock surveillance preview frame with noise reduction based on step progress."""
    img = Image.new("RGB", (width, height), color=(15, 23, 42))
    draw = ImageDraw.Draw(img)

    # Simulated CCTV grid overlay
    progress = step / max(total_steps, 1)
    
    # Add subtle scanlines/vignette
    for y in range(0, height, 4):
        draw.line([(0, y), (width, y)], fill=(10, 15, 30), width=1)

    # Header CCTV timestamp banner
    timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S") + f".{int((time.time()%1)*100):02d}"
    draw.rectangle([(10, 10), (width - 10, 35)], fill=(0, 0, 0, 180))
    draw.text((15, 14), f"CAM {camera_id} | REC [MOCK WAN2.2] | {timestamp_str}", fill=(0, 255, 136))

    # Center box showing generation status or simulated actor
    if visible:
        actor_x = int(width * 0.45 + (1.0 - progress) * 20)
        actor_y = int(height * 0.40)
        box_w, box_h = int(30 * (1.0 + progress * 0.2)), int(60 * (1.0 + progress * 0.2))
        
        # Bounding box indicator
        draw.rectangle(
            [(actor_x, actor_y), (actor_x + box_w, actor_y + box_h)],
            outline=(0, 255, 136) if progress > 0.5 else (255, 200, 0),
            width=2
        )
        draw.text((actor_x, actor_y - 12), f"ACTOR ({int(progress*100)}%)", fill=(0, 255, 136))
    else:
        draw.text((int(width * 0.35), int(height * 0.45)), "[ STATIC UNOCCUPIED ZONE ]", fill=(100, 116, 139))

    # Progress bar at bottom
    bar_width = width - 40
    fill_width = int(bar_width * progress)
    draw.rectangle([(20, height - 25), (width - 20, height - 15)], fill=(30, 41, 59))
    draw.rectangle([(20, height - 25), (20 + fill_width, height - 15)], fill=(0, 255, 136))
    draw.text((20, height - 42), f"Denoising Step {step}/{total_steps} (ETA: {max(0, (total_steps - step)*0.2):.1f}s)", fill=(203, 213, 225))

    return img


def frame_to_data_url(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=75)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


class MockSyntheticGeneratorService:
    @classmethod
    async def stream_generation(
        cls,
        camera: SyntheticCameraConfig,
        prompt: str,
        steps: int = 15,
        fps: int = 16,
        progress_cb: Optional[Callable] = None,
        visible: bool = True,
        width: int = 832,
        height: int = 480
    ) -> CameraVideoOutput:
        """Simulates step-by-step diffusion denoising with WebSocket progress streaming."""
        step_delay = 0.08  # Fast mock delay

        for step in range(1, steps + 1):
            await asyncio.sleep(step_delay)
            if progress_cb:
                preview_img = create_mock_preview_frame(
                    camera_id=camera.id,
                    prompt=prompt,
                    step=step,
                    total_steps=steps,
                    width=480,
                    height=270,
                    visible=visible
                )
                preview_url = frame_to_data_url(preview_img)
                await progress_cb(step, steps, preview_url)

        # In mock mode, point to existing sample or mock data
        return CameraVideoOutput(
            camera_id=camera.id,
            camera_name=camera.name or f"Camera {camera.id}",
            prompt=prompt,
            video_url=f"/outputs/mock_cam_{camera.id}.mp4",
            thumbnail_url=preview_url if progress_cb else None,
            frames_count=17,
            fps=fps,
            duration_seconds=17.0 / fps,
            visible=visible
        )

    @classmethod
    def start_job(cls, req: GenerationJobRequest) -> GenerationJobResponse:
        job_id = str(uuid.uuid4())
        job = GenerationJobResponse(
            job_id=job_id,
            status="pending",
            progress_percentage=0.0,
            outputs=[],
            created_at=time.time()
        )
        _JOB_STORE[job_id] = job
        
        # Launch async task in background
        asyncio.create_task(cls._execute_job(job_id, req))
        return job

    @classmethod
    async def _execute_job(cls, job_id: str, req: GenerationJobRequest):
        job = _JOB_STORE.get(job_id)
        if not job:
            return

        job.status = "running"
        engine = SyntheticSceneEngine(
            cameras=req.cameras,
            actor=req.actor,
            waypoints=req.waypoints,
            duration=req.duration,
            lighting=req.lighting
        )
        
        prompt_res = engine.generate_all_prompts()
        prompts_dict = {p.camera_id: p for p in prompt_res.prompts}

        total_cams = len(req.cameras)
        outputs: List[CameraVideoOutput] = []

        try:
            for idx, cam in enumerate(req.cameras):
                p_item = prompts_dict.get(cam.id)
                prompt = p_item.prompt if p_item else "Security surveillance footage."
                visible = p_item.visible if p_item else False

                out = await cls.stream_generation(
                    camera=cam,
                    prompt=prompt,
                    steps=min(req.steps, 15),
                    fps=req.fps,
                    visible=visible,
                    width=req.width,
                    height=req.height
                )
                outputs.append(out)
                job.progress_percentage = round(((idx + 1) / total_cams) * 100.0, 1)

            job.outputs = outputs
            job.status = "completed"
            job.completed_at = time.time()
        except Exception as exc:
            job.status = "failed"
            job.error = str(exc)

    @classmethod
    def get_job(cls, job_id: str) -> Optional[GenerationJobResponse]:
        return _JOB_STORE.get(job_id)
